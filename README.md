# Chinese Pinyin Extension

A Chrome extension that adds pinyin or English translation help to the Chinese text you select.

## What it does

- Select Chinese text on a page to show pinyin above just that selection.
- Switch between `Off`, `Pinyin`, and `English` modes from the popup.
- English mode currently uses a local mock translator so the UI is ready for a real API swap later.
- Select a different section and the old annotation disappears before the new one appears.
- Click elsewhere on the page or clear the selection to remove the current overlay.
- Turn overlays off entirely from the popup when you do not want annotations.
- Use the clear button to restore the page to normal.

## Run it

1. Run `npm install` in this folder if `node_modules` is missing.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Choose this folder: `/Users/ameliashen/Desktop/chinese-pinyin-extension/chinese-pinyin-extension`

## Files

- `manifest.json`: Chrome extension config
- `popup.html`, `popup.css`, `popup.js`: popup UI with mode switching and clear button
- `content.js`: selection handling, pinyin rendering, mock English translation, and page reset logic
