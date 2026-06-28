#!/usr/bin/env node
/**
 * Release management for this Lovelace card.
 *
 * Usage:
 *   node scripts/release.ts prepare [--dry-run]
 *   node scripts/release.ts tag     [--dry-run]
 *
 * `prepare` computes the next semver from conventional commits (git-cliff),
 * writes it to package.json and CHANGELOG.md, and force-pushes those changes to
 * the fixed `release` branch, creating or updating a draft release PR.
 *
 * `tag` reads the version from package.json (the source of truth) and pushes a
 * `vX.Y.Z` tag, which in turn triggers the GitHub Release.
 *
 * Run directly with Node's built-in TypeScript stripping (Node >= 23.6); no
 * build step or transpiler is required.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_JSON = join(ROOT, "package.json");
const CHANGELOG = join(ROOT, "CHANGELOG.md");

/** Git tag prefix; tags look like `v0.2.0`. */
const TAG_PREFIX = "v";
/** Fixed branch that always holds the pending release PR. */
const RELEASE_BRANCH = "release";

interface PackageManifest {
  name: string;
  version: string;
}

/** Run a command, returning its trimmed stdout. Throws on non-zero exit. */
function run(command: string, args: string[]): string {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readManifest(): PackageManifest {
  return JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as PackageManifest;
}

/**
 * Update the version field in package.json via a targeted substitution so that
 * formatting and key ordering are preserved (no JSON round-trip).
 */
function writeVersion(version: string): void {
  const content = readFileSync(PACKAGE_JSON, "utf8");
  const updated = content.replace(
    /("version"\s*:\s*")[^"]*(")/,
    `$1${version}$2`,
  );
  if (updated === content) {
    throw new Error(
      `Could not find version field to update in ${PACKAGE_JSON}`,
    );
  }
  writeFileSync(PACKAGE_JSON, updated);
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function computeTagName(version: string): string {
  return `${TAG_PREFIX}${version}`;
}

/**
 * Ask git-cliff for the next semver implied by the unreleased conventional
 * commits. Returns null when nothing warrants a bump (git-cliff fails, returns
 * empty, or returns the version already in package.json).
 */
function computeNextVersion(): string | null {
  const result = spawnSync("git-cliff", ["--bumped-version"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout.trim()) {
    return null;
  }
  const version = stripPrefix(result.stdout.trim(), TAG_PREFIX);
  if (version === readManifest().version) {
    return null;
  }
  return version;
}

/** Render the changelog body for a proposed version (no header). */
function generateChangelogBody(version: string): string {
  const tagName = computeTagName(version);
  return run("git-cliff", [
    "--tag",
    tagName,
    "--unreleased",
    "--strip",
    "header",
  ]);
}

/** Prepend the unreleased entry to CHANGELOG.md, leaving older entries intact. */
function updateChangelogFile(version: string): void {
  const tagName = computeTagName(version);
  run("git-cliff", ["--tag", tagName, "--unreleased", "--prepend", CHANGELOG]);
}

/** Return the number of the open release PR, or null if there is none. */
function findOpenReleasePr(): number | null {
  const out = run("gh", [
    "pr",
    "list",
    "--head",
    RELEASE_BRANCH,
    "--state",
    "open",
    "--json",
    "number",
    "--jq",
    "first",
  ]);
  if (!out || out === "null") {
    return null;
  }
  return (JSON.parse(out) as { number: number }).number;
}

/**
 * Reset the fixed release branch to origin/main, commit the prepared files,
 * force-push, then create or update the draft PR. The fixed branch means the
 * same PR is updated in place whenever the proposed version changes.
 */
function pushReleaseBranch(
  title: string,
  changelog: string,
  existingPr: number | null,
): void {
  run("git", ["checkout", "-B", RELEASE_BRANCH, "origin/main"]);
  run("git", ["add", "package.json", "CHANGELOG.md"]);
  run("git", ["commit", "-m", title]);
  run("git", ["push", "--force", "origin", RELEASE_BRANCH]);

  if (existingPr === null) {
    run("gh", [
      "pr",
      "create",
      "--title",
      title,
      "--body",
      changelog,
      "--base",
      "main",
      "--head",
      RELEASE_BRANCH,
      "--draft",
    ]);
  } else {
    run("gh", [
      "pr",
      "edit",
      String(existingPr),
      "--title",
      title,
      "--body",
      changelog,
    ]);
  }
}

/** Stage 1: create or update the draft release PR. */
function prepare(dryRun: boolean): void {
  const version = computeNextVersion();
  if (version === null) {
    console.log("No version bump needed. Nothing to do.");
    return;
  }

  console.log(`Proposed next version: ${version}`);
  const changelog = generateChangelogBody(version);
  const { name } = readManifest();
  const title = `chore(release): ${name} v${version}`;
  const existingPr = findOpenReleasePr();

  // Always write the files so the result can be inspected locally; they are
  // reverted cleanly with `git checkout`.
  writeVersion(version);
  updateChangelogFile(version);

  if (dryRun) {
    console.log(`\n--- Changelog for v${version} ---\n${changelog}`);
    console.log(
      existingPr === null
        ? `[dry-run] Would create draft PR on branch '${RELEASE_BRANCH}'.`
        : `[dry-run] Would update PR #${existingPr} on branch '${RELEASE_BRANCH}'.`,
    );
    console.log("[dry-run] Files written — use `git checkout` to revert.");
    return;
  }

  try {
    pushReleaseBranch(title, changelog, existingPr);
  } finally {
    // Leave the local checkout back on main even if the push failed.
    run("git", ["checkout", "main"]);
  }
  console.log(`Release PR for v${version} created/updated.`);
}

/** Stage 2: tag the merged release. Idempotent — a no-op if the tag exists. */
function tag(dryRun: boolean): void {
  const { version } = readManifest();
  const tagName = computeTagName(version);

  run("git", ["fetch", "--tags", "origin"]);
  if (run("git", ["tag", "-l", tagName])) {
    console.log(`Tag '${tagName}' already exists. Nothing to do.`);
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Would create and push tag '${tagName}'.`);
    return;
  }

  run("git", ["tag", tagName]);
  run("git", ["push", "origin", tagName]);
  console.log(`Tag '${tagName}' pushed.`);
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const command = args.find((arg) => !arg.startsWith("-"));

  if (command === "prepare") {
    prepare(dryRun);
  } else if (command === "tag") {
    tag(dryRun);
  } else {
    console.error("Usage: release.ts <prepare|tag> [--dry-run]");
    process.exit(1);
  }
}

main();
