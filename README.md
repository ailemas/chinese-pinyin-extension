# Chinese Pinyin Extension

A Chrome extension that adds blue pinyin above the Chinese text you select.

## What it does

- Select Chinese text on a page to show pinyin above just that selection.
- Select a different section and the old annotation disappears before the new one appears.
- Click elsewhere on the page or clear the selection to remove the current pinyin.
- Turn the feature on or off from the popup.
- Use the clear button to restore the page to normal.

## Run it

1. Run `npm install` in this folder if `node_modules` is missing.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Choose this folder: `/Users/ameliashen/Desktop/chinese-pinyin-extension/chinese-pinyin-extension`

## Files

- `manifest.json`: Chrome extension config
- `popup.html`, `popup.css`, `popup.js`: popup UI with toggle and clear button
- `content.js`: selection handling, pinyin annotation, and page reset logic
