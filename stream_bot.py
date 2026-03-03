#!/usr/bin/env python3
"""Self-hosted nonstop YouTube livestream bot."""

from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


class ConfigError(Exception):
    """Raised when config is invalid."""


def load_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ConfigError(f"Config file not found: {path}")

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"Invalid JSON in {path}: {exc}") from exc

    required = ["stream_key", "ingest_url", "media_dir", "video", "audio"]
    missing = [k for k in required if k not in data]
    if missing:
        raise ConfigError(f"Missing required config keys: {', '.join(missing)}")

    if not data["stream_key"] or data["stream_key"] == "YOUR_YOUTUBE_STREAM_KEY":
        raise ConfigError("Please set a valid stream_key in config.json")

    data.setdefault("file_extensions", [".mp4", ".mkv", ".mov", ".webm"])
    data.setdefault("shuffle", False)
    data.setdefault("restart_delay_seconds", 5)

    return data


def discover_media(media_dir: Path, exts: list[str]) -> list[Path]:
    exts_lower = {e.lower() for e in exts}
    files = [p for p in media_dir.iterdir() if p.is_file() and p.suffix.lower() in exts_lower]
    return sorted(files)


def build_ffmpeg_command(cfg: dict[str, Any], playlist_file: Path) -> list[str]:
    video = cfg["video"]
    audio = cfg["audio"]
    output = f"{cfg['ingest_url'].rstrip('/')}/{cfg['stream_key']}"

    return [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-re",
        "-stream_loop",
        "-1",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(playlist_file),
        "-vf",
        f"scale={video['resolution']},fps={video['fps']}",
        "-c:v",
        "libx264",
        "-preset",
        str(video["preset"]),
        "-b:v",
        str(video["bitrate"]),
        "-maxrate",
        str(video["maxrate"]),
        "-bufsize",
        str(video["bufsize"]),
        "-pix_fmt",
        "yuv420p",
        "-g",
        str(int(video["fps"]) * 2),
        "-c:a",
        "aac",
        "-b:a",
        str(audio["bitrate"]),
        "-ar",
        str(audio["sample_rate"]),
        "-f",
        "flv",
        output,
    ]


def write_playlist(paths: list[Path], playlist_path: Path) -> None:
    lines = []
    for media in paths:
        escaped = str(media.resolve()).replace("'", "'\\''")
        lines.append(f"file '{escaped}'")
    playlist_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_forever(cfg: dict[str, Any]) -> int:
    media_dir = Path(cfg["media_dir"]).expanduser().resolve()
    if not media_dir.exists() or not media_dir.is_dir():
        raise ConfigError(f"media_dir does not exist or is not a directory: {media_dir}")

    delay = int(cfg["restart_delay_seconds"])
    playlist_file = Path("/tmp/youtube_stream_playlist.txt")

    while True:
        media = discover_media(media_dir, cfg["file_extensions"])
        if not media:
            print(f"No media files found in {media_dir}. Retrying in {delay}s...", flush=True)
            time.sleep(delay)
            continue

        if cfg.get("shuffle", False):
            random.shuffle(media)

        write_playlist(media, playlist_file)
        cmd = build_ffmpeg_command(cfg, playlist_file)

        print(f"Starting FFmpeg with {len(media)} media files...", flush=True)
        process = subprocess.run(cmd, check=False)
        print(f"FFmpeg exited with code {process.returncode}. Restarting in {delay}s...", flush=True)
        time.sleep(delay)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a nonstop YouTube livestream bot")
    parser.add_argument("--config", default="config.json", help="Path to config JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        cfg = load_config(Path(args.config))
        return run_forever(cfg)
    except ConfigError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Stopped by user.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
