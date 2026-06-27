import './card.js';
import './editor.js';

const VERSION = '0.1.0';

// Register with the Lovelace custom card picker.
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oklch-light-card')) {
  window.customCards.push({
    type: 'oklch-light-card',
    name: 'OkLCh Light Card',
    description:
      'Perceptually-uniform OkLCh color picker for Home Assistant lights.',
    preview: true,
    documentationURL:
      'https://github.com/JP-Ellis/lovelace-oklch-light-card',
  });
}

// Friendly version banner.
// eslint-disable-next-line no-console
console.info(
  `%c OkLCh-Light-Card %c v${VERSION} `,
  'color:#fff;background:#6a3093;padding:2px 4px;border-radius:3px 0 0 3px;',
  'color:#6a3093;background:#fff;padding:2px 4px;border:1px solid #6a3093;border-radius:0 3px 3px 0;',
);
