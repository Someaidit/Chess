# YouTube Brainrot Blocker (Chrome/Edge Extension)

This extension blocks YouTube videos/Shorts when blocked terms appear in:
- card/title text on feeds/search/recommendations
- descriptions visible on cards/watch pages
- watch-page metadata, including parsed `videoDetails.keywords` tags when available

## Install (unpacked)
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `youtube-brainrot-blocker`.

## Notes
- Works on `www.youtube.com` and `m.youtube.com`.
- Hidden cards are removed from view.
- On blocked watch/short pages, playback is paused and a full-page block message is shown.
