# YouTube Ad Auto Blocker (Chrome Extension)

This repository contains a minimal Chrome extension that attempts to auto-block YouTube ads by:

- removing common ad container elements,
- clicking **Skip Ad** buttons as soon as they appear,
- accelerating and jumping to the end of ads that are currently playing.

## Files

- `manifest.json` — extension configuration (Manifest V3).
- `content.js` — logic injected on YouTube pages.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`/workspace/Chess`).

## Notes

- YouTube changes its markup frequently, so selectors may require updates over time.
- This extension is intended for personal/local use and educational purposes.
