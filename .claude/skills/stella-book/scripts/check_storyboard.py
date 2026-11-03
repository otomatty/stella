#!/usr/bin/env python3
"""絵コンテ (storyboard.json) の形と分量を確かめる。

  python3 check_storyboard.py storyboard.json [--source chapter.md]

- 場面の id (英数字・-・_ の 64 文字以内、重複なし)、話者が speakers にあるか
- ボードの種類・必須の項目とその型・項目の数、show の番号が範囲内か
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
# 動画の HTML の id・セレクターにそのまま入るので、build_video.mjs と同じ形に限る。
SCENE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")


def is_text(value):
    return isinstance(value, str) and bool(value.strip())


def check_board(board, where):
    """build_video.mjs がボードを描くのに使う項目が、決まった型で揃っているか。"""
    if not isinstance(board, dict):
        return [f"{where}: board はオブジェクトにする"]
    kind = board.get("type")
    if not isinstance(kind, str) or kind not in BOARD_ITEMS:
        return [f"{where}: 知らないボードの種類 {kind}"]
    errors = []
    key = BOARD_ITEMS[kind]
    items = board.get(key)
    if not isinstance(items, list) or not items:
        return [f"{where}: {kind} の {key} を 1 つ以上の配列にする"]
    if len(items) > LIMITS[kind]:
        errors.append(f"{where}: {kind} の項目は {LIMITS[kind]} 個まで ({len(items)} 個)")
    for field in ("title",) if kind == "title" else ("quote", "by") if kind == "quote" else ():
        if not is_text(board.get(field)):
            errors.append(f"{where}: {kind} の {field} を文字列で書く")
    for field in ("title", "kicker", "note", "direction"):
        if board.get(field) is not None and not isinstance(board.get(field), str):
            errors.append(f"{where}: {field} は文字列にする")
    for i, item in enumerate(items):
        at = f"{where}: {key}[{i}]"
        if kind == "cards":
            if not (isinstance(item, dict) and is_text(item.get("head"))):
                errors.append(f"{at} は head (文字列) を持つオブジェクトにする")
            elif item.get("body") is not None and not isinstance(item["body"], str):
                errors.append(f"{at}.body は文字列にする")
        elif kind == "flow":
            if not (isinstance(item, dict) and is_text(item.get("label"))):
                errors.append(f"{at} は label (文字列) を持つオブジェクトにする")
            elif item.get("note") is not None and not isinstance(item["note"], str):
                errors.append(f"{at}.note は文字列にする")
        elif not is_text(item):
            errors.append(f"{at} は空でない文字列にする")
    if kind == "compare":
        rows = board.get("rows")
        if not isinstance(rows, list) or not rows:
            errors.append(f"{where}: compare の rows を 1 つ以上の配列にする")
        else:
            if len(rows) > 3:
                errors.append(f"{where}: compare の行は 3 つまで ({len(rows)} 行)")
            for i, row in enumerate(rows):
                cells = row.get("cells") if isinstance(row, dict) else None
                if not (isinstance(row, dict) and is_text(row.get("label"))):
                    errors.append(f"{where}: rows[{i}] は label (文字列) を持つオブジェクトにする")
                elif not isinstance(cells, list) or not all(isinstance(c, str) for c in cells):
                    errors.append(f"{where}: rows[{i}].cells を文字列の配列にする")
                elif len(cells) != len(items):
                    errors.append(f"{where}: 行「{row['label']}」のセルの数が列の数と違う")
    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("storyboard")
    ap.add_argument("--source")
    ap.add_argument("--max-line", type=int, default=72)
    args = ap.parse_args()
    sb = json.loads(Path(args.storyboard).read_text(encoding="utf-8"))
    if not isinstance(sb, dict):
        sys.exit("storyboard.json は JSON のオブジェクトにする")
    errors, warnings = [], []
    speakers = sb.get("speakers")
    if not isinstance(speakers, dict) or len(speakers) != 2:
        errors.append("speakers はちょうど 2 人にする")
        speakers = speakers if isinstance(speakers, dict) else {}
    for name, speaker in speakers.items():
        if not (isinstance(speaker, dict) and is_text(speaker.get("voice"))):
            errors.append(f"speakers.{name}: voice (Gemini の声の名前) を書く")
        elif speaker.get("style") is not None and not isinstance(speaker["style"], str):
            errors.append(f"speakers.{name}: style は文字列にする")
    scenes = sb.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errors.append("scenes を 1 つ以上の配列にする")
        scenes = []
    total_chars, lines = 0, 0
    seen_ids = set()
    for si, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            errors.append(f"scenes[{si}]: オブジェクトにする")
            continue
        sid = scene.get("id")
        where = f"scene {sid}" if isinstance(sid, str) else f"scenes[{si}]"
        if not (isinstance(sid, str) and SCENE_ID.match(sid)):
            errors.append(f"{where}: id は英数字・-・_ の 64 文字以内にする (例 s3)")
        elif sid in seen_ids:
            errors.append(f"{where}: id が重複している")
        else:
            seen_ids.add(sid)
        if scene.get("section") is not None and not isinstance(scene["section"], str):
            errors.append(f"{where}: section は文字列にする")
        board_errors = check_board(scene.get("board"), where)
        errors += board_errors
        board = scene.get("board") if isinstance(scene.get("board"), dict) else {}
        kind = board.get("type") if isinstance(board.get("type"), str) else None
        items = board.get(BOARD_ITEMS.get(kind, "items"))
        items = items if isinstance(items, list) else []
        scene_lines = scene.get("lines")
        if not isinstance(scene_lines, list) or not scene_lines:
            errors.append(f"{where}: lines を 1 行以上の配列にする")
            continue
        shown = set()
        for li, line in enumerate(scene_lines):
            at = f"{where} line {li + 1}"
            if not isinstance(line, dict):
                errors.append(f"{at}: オブジェクトにする")
                continue
            if not isinstance(line.get("speaker"), str) or line["speaker"] not in speakers:
                errors.append(f"{at}: 話者 {line.get('speaker')} が speakers にない")
            text = line.get("text")
            if not isinstance(text, str) or not text.strip():
                errors.append(f"{at}: 本文が空")
                continue
            if line.get("style") is not None and not isinstance(line["style"], str):
                errors.append(f"{at}: style は文字列にする")
            if len(text) > args.max_line:
                errors.append(f"{at}: {len(text)} 字 (字幕は {args.max_line} 字まで)")
            if BAD.search(text):
                errors.append(f"{at}: 記号・URL・演技指示が本文にある: {BAD.search(text).group(0)}")
            show = line.get("show")
            for n in ([] if show is None else show if isinstance(show, list) else [show]):
                if isinstance(n, bool) or not isinstance(n, int):
                    errors.append(f"{at}: show {n!r} は項目の番号 (0 始まりの整数) にする")
                    continue
                if not board_errors and not 0 <= n < len(items):
                    errors.append(f"{at}: show {n} が項目の範囲外 (0〜{len(items) - 1})")
                    continue
                shown.add(n)
            total_chars += len(re.sub(r"\s", "", text))
            lines += 1
        never = [i for i in range(len(items)) if i not in shown]
        if never and not board_errors:
            warnings.append(f"{where}: 一度も出さない{'列' if kind == 'compare' else '項目'} {never}")
    report = {"scenes": len(scenes), "lines": lines, "chars": total_chars,
              "estimated_minutes": round(total_chars / 450, 1)}
    if args.source:
        body = re.sub(r"<!--.*?-->", "", Path(args.source).read_text(encoding="utf-8"), flags=re.S)
        source_chars = len(re.sub(r"\s", "", body))
        report["source_chars"] = source_chars
        report["ratio"] = round(total_chars / max(source_chars, 1), 3)
        if not 0.2 <= report["ratio"] <= 0.4:
            warnings.append(f"台本は原文の {report['ratio']:.0%} (目安は 25〜35%)")
    report["errors"], report["warnings"] = errors, warnings
    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
