# Chinese Pinyin Extension

A Chrome extension that adds pinyin or English translation to the Chinese text you select.

## What it does

- Select Chinese text on a page to show pinyin above just that selection.
- Switch between `Off`, `Pinyin`, and `English` modes from the popup.
- English mode now sends the selected text through the extension background worker to a Vercel function.
- Select a different section and the old annotation disappears before the new one appears.
- Click elsewhere on the page or clear the selection to remove the current overlay.
- Turn overlays off entirely from the popup when you do not want annotations.
- Use the clear button to restore the page to normal.
