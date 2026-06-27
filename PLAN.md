# PLAN

## File structure
```
lovelace-oklch-light-card/
├── .github/workflows/release.yml
├── .gitignore
├── CHANGELOG.md
├── DECISIONS.md
├── LICENSE
├── PLAN.md
├── README.md
├── SPEC.md
├── SUMMARY.md          # written last
├── hacs.json
├── info.md
├── package.json
├── rollup.config.mjs
├── tsconfig.json
├── src/
│   ├── card.ts         # OklchLightCard (Lit element)
│   ├── editor.ts       # OklchLightCardEditor (ha-form)
│   ├── picker.ts       # internal Lit picker component
│   ├── color.ts        # culori glue (clamp, conversions)
│   ├── types.ts        # HA + config types
│   └── index.ts        # entry: registers card, editor, customCards
└── dist/
    └── oklch-light-card.js   # built artifact
```

## Phases
1. Spec / decisions / plan (this file) — done by coordinator.
2. Scaffold + dependency install + build pipeline working with stub (one
   subagent).
3. Parallel core build:
   - A: `picker.ts` + `color.ts`
   - B: `card.ts` + `types.ts` + `index.ts` wiring
   - C: `editor.ts`
   - D: README + info.md + CI workflow + LICENSE + CHANGELOG
4. Integrate, run `npm run build`, fix issues. Self-review pass.
5. git init, commit, tag v0.1.0, write SUMMARY.md.
