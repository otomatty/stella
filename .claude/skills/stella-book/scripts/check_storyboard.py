#!/usr/bin/env python3
"""絵コンテ (storyboard.json) の形と分量を確かめる。

  python3 check_storyboard.py storyboard.json [--source chapter.md]

- 話者が speakers にあるか、ボードの種類と項目の数、show の番号が範囲内か
- 1 行の長さ (字幕は 2 段まで。既定 72 字)、記号・タグ・演技指示が本文に混ざっていないか
- 台本の総文字数、原文に対する割合、推定の長さ (日本語 約450字/分)
"""
import argparse
import json
import re
import sys
from pathlib import Path

BOARD_ITEMS = {"title": "items", "cards": "items", "flow": "items", "quote": "items", "summary": "items", "compare": "columns"}
LIMITS = {"cards": 4, "flow": 6, "summary": 5, "title": 4, "quote": 4, "compare": 3}
BAD = re.compile(r"[<>#*`|/\\]|https?://|（[^）]*(ながら|ように|で)）")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("storyboard")
    ap.add_argument("--source")
    ap.add_argument("--max-line", type=int, default=72)
    args = ap.parse_args()
    sb = json.loads(Path(args.storyboard).read_text(encoding="utf-8"))
    errors, warnings = [], []
    speakers = sb.get("speakers", {})
    if len(speakers) != 2:
        errors.append("speakers はちょうど 2 人にする")
    total_chars, lines = 0, 0
    for si, scene in enumerate(sb.get("scenes", [])):
        where = f"scene {scene.get('id', si)}"
        board = scene.get("board", {})
        kind = board.get("type")
        if kind not in BOARD_ITEMS:
            errors.append(f"{where}: 知らないボードの種類 {kind}")
            continue
        items = board.get(BOARD_ITEMS[kind], [])
        if len(items) > LIMITS[kind]:
            errors.append(f"{where}: {kind} の項目は {LIMITS[kind]} 個まで ({len(items)} 個)")
        if kind == "compare":
            for row in board.get("rows", []):
                if len(row.get("cells", [])) != len(items):
                    errors.append(f"{where}: 行「{row.get('label')}」のセルの数が列の数と違う")
        shown = set()
        for li, line in enumerate(scene.get("lines", [])):
            at = f"{where} line {li + 1}"
            if line.get("speaker") not in speakers:
                errors.append(f"{at}: 話者 {line.get('speaker')} が speakers にない")
            text = line.get("text", "")
            if not text.strip():
                errors.append(f"{at}: 本文が空")
            if len(text) > args.max_line:
                errors.append(f"{at}: {len(text)} 字 (字幕は {args.max_line} 字まで)")
            if BAD.search(text):
                errors.append(f"{at}: 記号・URL・演技指示が本文にある: {BAD.search(text).group(0)}")
            show = line.get("show")
            for n in ([] if show is None else show if isinstance(show, list) else [show]):
                if not isinstance(n, int) or not 0 <= n < len(items):
                    errors.append(f"{at}: show {n} が項目の範囲外 (0〜{len(items) - 1})")
                shown.add(n)
            total_chars += len(re.sub(r"\s", "", text))
            lines += 1
        never = [i for i in range(len(items)) if i not in shown]
        if never and kind not in ("compare",):
            warnings.append(f"{where}: 一度も出さない項目 {never}")
        if kind == "compare" and never:
            warnings.append(f"{where}: 一度も出さない列 {never}")
    report = {"scenes": len(sb.get("scenes", [])), "lines": lines, "chars": total_chars,
              "estimated_minutes": round(total_chars / 450, 1)}
    if args.source:
        body = re.sub(r"<!--.*?-->", "", Path(args.source).read_text(encoding="utf-8"), flags=re.S)
        source_chars = len(re.sub(r"\s", "", body))
        report["source_chars"] = source_chars
        report["ratio"] = round(total_chars / source_chars, 3)
        if not 0.2 <= report["ratio"] <= 0.4:
            warnings.append(f"台本は原文の {report['ratio']:.0%} (目安は 25〜35%)")
    report["errors"], report["warnings"] = errors, warnings
    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
