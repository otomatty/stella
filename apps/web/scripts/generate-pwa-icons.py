#!/usr/bin/env python3
"""Render PWA / touch PNGs from SVG sources in apps/web/public/."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[1] / "public"
CAIROSVG = Path.home() / ".local" / "bin" / "cairosvg"


def render(svg: Path, png: Path, size: int) -> None:
    cmd = [
        str(CAIROSVG),
        str(svg),
        "-o",
        str(png),
        "-W",
        str(size),
        "-H",
        str(size),
    ]
    subprocess.run(cmd, check=True)


def main() -> int:
    if not CAIROSVG.is_file():
        print("cairosvg CLI not found; install with: pip install cairosvg", file=sys.stderr)
        return 1

    icon_svg = PUBLIC / "icon.svg"
    maskable_svg = PUBLIC / "icon-maskable.svg"

    render(icon_svg, PUBLIC / "icon-192.png", 192)
    render(icon_svg, PUBLIC / "icon-512.png", 512)
    render(maskable_svg, PUBLIC / "icon-maskable-192.png", 192)
    render(maskable_svg, PUBLIC / "icon-maskable-512.png", 512)
    render(icon_svg, PUBLIC / "apple-touch-icon.png", 180)

    print("Generated PWA icons in", PUBLIC)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
