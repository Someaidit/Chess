# NeonLoop: Self-Hosted YouTube 24/7 Livestream Bot

A Python + FFmpeg livestream engine with **channel-surf scheduling**, **anti-repeat queue logic**, and **live on-stream overlays**.

## Why this is different
Instead of endlessly looping one static folder, this bot behaves like a mini TV network:

- **Channel Surf Mode**: rotates between multiple content channels (folders) on a timed interval with weighted randomness.
- **Anti-repeat Queue**: avoids replaying the same clips too quickly using a rolling cooldown window.
- **Dynamic Overlays**: adds live watermark + channel name + real-time clock directly on stream.
- **Fallback Scene**: if a channel runs out of clips, it automatically streams a generated “be right back / switching channel” scene.

## Features
- 24/7 YouTube RTMP streaming
- Multiple channels with weights
- Recursive media discovery
- Batch-based playlist generation for variety
- Optional audio loudness normalization (`loudnorm`)
- `--dry-run` mode to inspect generated FFmpeg command safely

## Requirements
- Python 3.10+
- `ffmpeg` installed and in `PATH`
- YouTube stream key

## Quick Start
1. Create config:
   ```bash
   cp config.example.json config.json
   ```
2. Set your stream key in `config.json`.
3. Put videos under channel folders from config (example):
   ```
   ./media/chill
   ./media/hype
   ./media/cinematic
   ```
4. Test without streaming:
   ```bash
   python stream_bot.py --config config.json --dry-run
   ```
5. Go live:
   ```bash
   python stream_bot.py --config config.json
   ```

## Main Config Concepts
- `channels`: list of channel objects with `name`, `path`, and optional `weight`
- `channel_surf`: controls timed channel switching
- `batch_size`: number of clips selected each cycle
- `cooldown_window`: how many recently played clips to avoid
- `overlay`: on-stream watermark + clock toggles
- `fallback_scene`: generated scene when no media found in selected channel

## Useful Commands
- One cycle only:
  ```bash
  python stream_bot.py --config config.json --once
  ```
- Dry run command generation:
  ```bash
  python stream_bot.py --config config.json --dry-run
  ```

## Deployment Tip
Run with `systemd`/Docker/PM2/supervisor for automatic restart at process level.
