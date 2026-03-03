# YouTube 24/7 Livestream Bot (Self-hosted)

A self-hosted Python + FFmpeg bot that runs a non-stop YouTube livestream by looping through local video files.

## Features
- 24/7 looping livestream to YouTube RTMP ingest
- Automatic restart on FFmpeg crash/disconnect
- Rotates through all media files in a folder
- Optional shuffle mode
- Configurable bitrate, FPS, resolution, and audio settings

## Requirements
- Python 3.10+
- `ffmpeg` installed and available in `PATH`
- A YouTube livestream key

## Quick Start
1. Create a config:
   ```bash
   cp config.example.json config.json
   ```
2. Add your stream key and media path in `config.json`.
3. Put videos in your media directory (e.g., `./media`).
4. Run:
   ```bash
   python stream_bot.py --config config.json
   ```

## Configuration
`config.json` fields:

- `stream_key`: Your YouTube stream key
- `ingest_url`: RTMP endpoint (default: `rtmp://a.rtmp.youtube.com/live2`)
- `media_dir`: Directory containing videos
- `file_extensions`: Allowed media extensions
- `shuffle`: Shuffle playlist each cycle
- `restart_delay_seconds`: Delay before retry on failure
- `video`: video encode settings (`resolution`, `fps`, `bitrate`, `maxrate`, `bufsize`, `preset`)
- `audio`: audio encode settings (`bitrate`, `sample_rate`)

## Notes
- Keep stream key private.
- For reliability, run under systemd, Docker, or a process manager.

## systemd (optional)
Example unit:

```ini
[Unit]
Description=YouTube 24/7 Livestream Bot
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/youtube-bot
ExecStart=/usr/bin/python3 /opt/youtube-bot/stream_bot.py --config /opt/youtube-bot/config.json
Restart=always
RestartSec=5
User=streambot

[Install]
WantedBy=multi-user.target
```
