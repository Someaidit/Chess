# Mega QoL Toolkit Chrome Extension

This extension adds **150 quality-of-life features** that can be enabled per browser profile and applied to the active page.

## Install locally
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chrome-qol-extension` folder.

## What is included
- 150 individually toggleable features.
- Searchable popup feature catalog.
- Sync storage of enabled toggles.
- Content script applies enabled features on every website.

## Files
- `manifest.json` - extension manifest (MV3)
- `content.js` - feature engine + handlers
- `features.js` - full 150-feature catalog
- `popup.html/js/css` - UI for toggling features
- `background.js` - message bridge for toggles
