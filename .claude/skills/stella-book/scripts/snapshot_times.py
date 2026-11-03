#!/usr/bin/env python3
"""build_video.mjs が書いた timeline.json から、確認用の静止画を撮る時刻を出す。

  python3 snapshot_times.py <video_project>/timeline.json [--scene s3]

場面ごとに 3 枚 (見出しだけの頃・半分の行が出た頃・全部出た終わり際)。
出力は `npx hyperframes snapshot <dir> --at <ここ> --no-end -o shots` にそのまま渡せる。
"""
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("timeline")
    parser.add_argument("--scene", help="この場面だけ")
    args = parser.parse_args()
    timeline = json.loads(Path(args.timeline).read_text(encoding="utf-8"))
    times = []
    for scene in timeline["scenes"]:
        if args.scene and scene["id"] != args.scene:
            continue
        lines = scene["lines"]
        middle = lines[len(lines) // 2]
        times += [scene["start"] + 1.3, middle["start"] + 0.8, scene["end"] - 1.4]
    print(",".join(f"{t:.2f}" for t in times))


if __name__ == "__main__":
    main()
