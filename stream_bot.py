#!/usr/bin/env python3
"""Self-hosted nonstop YouTube livestream bot with channel-surf scheduling."""

from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


class ConfigError(Exception):
    """Raised when config is invalid."""


@dataclass
class Channel:
    name: str
    path: Path
    weight: int = 1


def load_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ConfigError(f"Config file not found: {path}")

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"Invalid JSON in {path}: {exc}") from exc

    required = ["stream_key", "ingest_url", "video", "audio"]
    missing = [k for k in required if k not in data]
    if missing:
        raise ConfigError(f"Missing required config keys: {', '.join(missing)}")

    if not data["stream_key"] or data["stream_key"] == "YOUR_YOUTUBE_STREAM_KEY":
        raise ConfigError("Please set a valid stream_key in config.json")

    data.setdefault("media_dir", "./media")
    data.setdefault("file_extensions", [".mp4", ".mkv", ".mov", ".webm"])
    data.setdefault("shuffle", True)
    data.setdefault("restart_delay_seconds", 4)
    data.setdefault("batch_size", 10)
    data.setdefault("cooldown_window", 20)
    data.setdefault("channel_surf", {"enabled": False, "switch_interval_seconds": 1800})
    data.setdefault("overlay", {"enabled": True, "watermark": "LIVE", "clock": True})
    data.setdefault("audio", data["audio"])
    data.setdefault("fallback_scene", {"enabled": True, "message": "Be right back", "duration_seconds": 30})

    return data


def load_channels(cfg: dict[str, Any]) -> list[Channel]:
    if "channels" not in cfg:
        base = Path(cfg["media_dir"]).expanduser().resolve()
        return [Channel(name="main", path=base, weight=1)]

    channels: list[Channel] = []
    for raw in cfg["channels"]:
        if "name" not in raw or "path" not in raw:
            raise ConfigError("Each channel must include 'name' and 'path'")
        channels.append(
            Channel(
                name=str(raw["name"]),
                path=Path(str(raw["path"])).expanduser().resolve(),
                weight=max(1, int(raw.get("weight", 1))),
            )
        )

    if not channels:
        raise ConfigError("At least one channel is required")
    return channels


def discover_media(media_dir: Path, exts: list[str]) -> list[Path]:
    exts_lower = {e.lower() for e in exts}
    files = [
        p
        for p in media_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in exts_lower and not p.name.startswith(".")
    ]
    return sorted(files)


def pick_channel(channels: list[Channel], surf_cfg: dict[str, Any], cycle_index: int) -> Channel:
    if not surf_cfg.get("enabled", False):
        return channels[0]

    switch_secs = max(60, int(surf_cfg.get("switch_interval_seconds", 1800)))
    slot = int(time.time() // switch_secs)
    random.seed(slot + cycle_index)
    expanded: list[Channel] = []
    for channel in channels:
        expanded.extend([channel] * channel.weight)
    return random.choice(expanded)


def build_batch(
    media: list[Path],
    batch_size: int,
    shuffle: bool,
    recent: deque[Path],
) -> list[Path]:
    if shuffle:
        random.shuffle(media)

    selected: list[Path] = []
    recent_set = set(recent)

    for candidate in media:
        if len(selected) >= batch_size:
            break
        if candidate not in recent_set:
            selected.append(candidate)

    if len(selected) < batch_size:
        for candidate in media:
            if len(selected) >= batch_size:
                break
            if candidate not in selected:
                selected.append(candidate)

    for clip in selected:
        recent.append(clip)

    return selected


def _escape_drawtext(value: str) -> str:
    return value.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def build_video_filter(cfg: dict[str, Any], channel_name: str) -> str:
    video = cfg["video"]
    filters = [f"scale={video['resolution']}", f"fps={video['fps']}"]

    overlay_cfg = cfg.get("overlay", {})
    if not overlay_cfg.get("enabled", False):
        return ",".join(filters)

    watermark = _escape_drawtext(str(overlay_cfg.get("watermark", "LIVE")))
    channel = _escape_drawtext(channel_name)
    filters.append(
        "drawtext="
        f"text='{watermark} • Channel\: {channel}':"
        "x=20:y=20:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.45"
    )

    if overlay_cfg.get("clock", True):
        filters.append(
            "drawtext="
            "text='%{localtime\\:%Y-%m-%d %H\\:%M\\:%S}':"
            "x=w-tw-20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.45"
        )

    return ",".join(filters)


def build_ffmpeg_command(cfg: dict[str, Any], playlist_file: Path, channel_name: str) -> list[str]:
    video = cfg["video"]
    audio = cfg["audio"]
    output = f"{cfg['ingest_url'].rstrip('/')}/{cfg['stream_key']}"

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-re",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(playlist_file),
        "-vf",
        build_video_filter(cfg, channel_name),
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

    if audio.get("normalize", False):
        cmd.insert(cmd.index("-c:a"), "-af")
        cmd.insert(cmd.index("-c:a"), "loudnorm=I=-16:TP=-1.5:LRA=11")

    return cmd


def write_playlist(paths: list[Path], playlist_path: Path) -> None:
    lines = ["ffconcat version 1.0"]
    for media in paths:
        escaped = str(media.resolve()).replace("'", "'\\''")
        lines.append(f"file '{escaped}'")
    playlist_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_fallback_scene(cfg: dict[str, Any], output_url: str) -> int:
    fallback = cfg.get("fallback_scene", {})
    if not fallback.get("enabled", True):
        return 0

    message = _escape_drawtext(str(fallback.get("message", "Be right back")))
    duration = max(5, int(fallback.get("duration_seconds", 30)))
    video = cfg["video"]

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-re",
        "-f",
        "lavfi",
        "-i",
        f"color=c=black:s={video['resolution']}:r={video['fps']}",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-t",
        str(duration),
        "-vf",
        (
            "drawtext="
            f"text='{message}':"
            "x=(w-tw)/2:y=(h-th)/2:fontsize=52:fontcolor=white:box=1:boxcolor=black@0.5"
        ),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-f",
        "flv",
        output_url,
    ]
    return subprocess.run(cmd, check=False).returncode


def run_forever(cfg: dict[str, Any], dry_run: bool = False, once: bool = False) -> int:
    channels = load_channels(cfg)
    exts = cfg["file_extensions"]
    delay = int(cfg["restart_delay_seconds"])
    batch_size = max(1, int(cfg.get("batch_size", 10)))
    cooldown_window = max(batch_size, int(cfg.get("cooldown_window", 20)))
    shuffle = bool(cfg.get("shuffle", True))
    output_url = f"{cfg['ingest_url'].rstrip('/')}/{cfg['stream_key']}"

    playlist_file = Path("/tmp/youtube_stream_playlist.txt")
    recent: deque[Path] = deque(maxlen=cooldown_window)
    cycle = 0

    while True:
        cycle += 1
        channel = pick_channel(channels, cfg.get("channel_surf", {}), cycle)
        if not channel.path.exists() or not channel.path.is_dir():
            raise ConfigError(f"Channel directory missing: {channel.path}")

        media = discover_media(channel.path, exts)
        if not media:
            now = datetime.now().strftime("%H:%M:%S")
            print(f"[{now}] No media in channel '{channel.name}'. Running fallback scene...", flush=True)
            if not dry_run:
                run_fallback_scene(cfg, output_url)
            if once:
                return 0
            time.sleep(delay)
            continue

        batch = build_batch(media, batch_size, shuffle, recent)
        write_playlist(batch, playlist_file)
        cmd = build_ffmpeg_command(cfg, playlist_file, channel.name)

        print(
            f"Cycle {cycle} | channel={channel.name} | clips={len(batch)} | first={batch[0].name}",
            flush=True,
        )

        if dry_run:
            print("FFmpeg command:")
            print(" ".join(cmd))
            return 0

        process = subprocess.run(cmd, check=False)
        print(f"FFmpeg exited with code {process.returncode}. Restarting in {delay}s...", flush=True)
        if once:
            return process.returncode
        time.sleep(delay)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a nonstop YouTube livestream bot")
    parser.add_argument("--config", default="config.json", help="Path to config JSON")
    parser.add_argument("--dry-run", action="store_true", help="Build one cycle and print FFmpeg command")
    parser.add_argument("--once", action="store_true", help="Run a single cycle then exit")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        cfg = load_config(Path(args.config))
        return run_forever(cfg, dry_run=args.dry_run, once=args.once)
    except ConfigError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Stopped by user.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
