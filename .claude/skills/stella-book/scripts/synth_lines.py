#!/usr/bin/env python3
"""絵コンテ (storyboard.json) のセリフを 1 行ずつ Gemini TTS で音声にし、長さを測る。

  python3 synth_lines.py storyboard.json -o work/audio [--key-file PATH] [--workers 4] [--dry-run] [--mock]

- 1 行 = 1 リクエスト (話者の声 1 つ + style)。字幕と図解をセリフに合わせるため、行ごとに長さを測る。
- 結果は <out>/<hash>.wav (24kHz・mono) と <out>/timings.json (行ごとのファイルと秒数)。
- 同じ内容 (モデル・声・style・本文) の行は 1 回だけ作り、同じファイルを使う。失敗した行は再実行で続きから作る。
- API キーは --key-file、環境変数 GEMINI_API_KEY、md-audiobook と同じ ~/.config/md-audiobook/gemini_key の順に探す。
  キーの値は表示・ログ出力しない。
- --mock は API を呼ばず、推定の長さの小さな音で流れだけを確かめる (動画の組み立て・書き出しの試験用)。
  timings.json に "mock": true が付き、build_video.mjs は --allow-mock なしではこれを使わない。
- md-audiobook の synthesize.py と同じ Interactions API を使う (インラインの <pause> タグは送らない)。
"""
import argparse
import base64
import concurrent.futures as cf
import hashlib
import io
import json
import os
import re
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
SAMPLE_RATE = 24000
RETRY = {408, 429, 500, 502, 503, 504}
CJK = re.compile(r"[぀-ヿ㐀-鿿]")


def log(message):
    print(message, file=sys.stderr, flush=True)


def lines_of(storyboard):
    for scene in storyboard["scenes"]:
        for index, line in enumerate(scene["lines"]):
            speaker = storyboard["speakers"][line["speaker"]]
            yield {
                "scene": scene["id"],
                "index": index,
                "speaker": line["speaker"],
                "voice": speaker["voice"],
                "style": line.get("style") or speaker.get("style") or "",
                "text": line["text"],
            }


def line_hash(model, line):
    key = json.dumps([model, line["voice"], line["style"], line["text"]], ensure_ascii=False)
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def request_body(model, line):
    entry = {"type": "text", "text": line["text"]}
    if line["style"]:
        entry["annotations"] = [{"type": "speech_metadata", "style": line["style"]}]
    return {
        "model": model,
        "input": [{"type": "user_input", "content": [entry]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": line["voice"]}]},
    }


def find_audio(obj):
    found = []

    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == "audio" and isinstance(node.get("data"), str):
                found.append(node["data"])
            inline = node.get("inlineData")
            if isinstance(inline, dict) and str(inline.get("mimeType", "")).startswith("audio"):
                found.append(inline["data"])
            output = node.get("output_audio")
            if isinstance(output, dict) and isinstance(output.get("data"), str):
                found.append(output["data"])
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(obj)
    return found[-1] if found else None


def call(body, key, attempts=6):
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    context = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
    for attempt in range(attempts):
        request = urllib.request.Request(API_URL, data=data, method="POST", headers={
            "Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(request, timeout=300, context=context) as response:
                payload = json.loads(response.read().decode("utf-8"))
            audio = find_audio(payload)
            if not audio:
                raise RuntimeError("応答に音声がありません")
            return base64.b64decode(audio)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:300]
            if error.code in RETRY and attempt < attempts - 1:
                wait = min(60, 3 * 2 ** attempt)
                log(f"  HTTP {error.code}、{wait}秒後に再試行")
                time.sleep(wait)
                continue
            raise RuntimeError(f"HTTP {error.code}: {detail}") from None
        except (urllib.error.URLError, TimeoutError, ConnectionError, RuntimeError) as error:
            if attempt < attempts - 1:
                wait = min(60, 3 * 2 ** attempt)
                log(f"  {error}、{wait}秒後に再試行")
                time.sleep(wait)
                continue
            raise


def to_wav(audio):
    """応答 (WAV か 24kHz/16bit/mono の PCM) を 24kHz・mono の WAV にする。"""
    if audio[:4] == b"RIFF":
        result = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-ac", "1", "-ar", str(SAMPLE_RATE),
                                 "-f", "wav", "pipe:1"], input=audio, capture_output=True, check=True)
        return result.stdout
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(audio)
    return buffer.getvalue()


def trim(path):
    """前後の無音を落とす (セリフの間は組み立てで決める)。"""
    trimmed = path.with_suffix(".trim.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,"
                    "areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse",
                    str(trimmed)], check=True)
    trimmed.replace(path)


def seconds(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return round(float(out.strip()), 3)


def mock_wav(text, path):
    """推定の長さの、小さな音 (220Hz) の WAV。セリフの代わりにはならない (試験用)。"""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                    f"sine=frequency=220:sample_rate={SAMPLE_RATE}:duration={estimate(text) * 1.35:.2f}",
                    "-af", "volume=0.05", "-ac", "1", str(path)], check=True)


def read_key(key_file):
    if key_file:
        return Path(os.path.expanduser(key_file)).read_text().strip()
    if os.environ.get("GEMINI_API_KEY", "").strip():
        return os.environ["GEMINI_API_KEY"].strip()
    shared = Path.home() / ".config/md-audiobook/gemini_key"
    return shared.read_text().strip() if shared.exists() else ""


def estimate(text):
    cjk = len(CJK.findall(text))
    return cjk / 7.5 + (len(text) - cjk) / 15.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("storyboard")
    parser.add_argument("-o", "--out", required=True)
    parser.add_argument("--key-file")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--mock", action="store_true", help="API を呼ばずに小さな音で流れを試す (試験用)")
    args = parser.parse_args()

    storyboard = json.loads(Path(args.storyboard).read_text(encoding="utf-8"))
    model = storyboard.get("model", "gemini-3.8-flash-tts")
    lines = list(lines_of(storyboard))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for line in lines:
        line["file"] = f"{'mock-' if args.mock else ''}{line_hash(model, line)}.wav"
    # 同じ内容の行は同じファイルになるので、作るのは 1 回だけ (同時に同じファイルへ書かない)。
    users = {}
    for line in lines:
        users.setdefault(line["file"], []).append(line)
    todo = [same[0] for file, same in users.items() if not (out / file).exists()]
    plan = {"lines": len(lines), "to_synthesize": len(todo), "model": model,
            "estimated_minutes": round(sum(estimate(line["text"]) for line in lines) / 60, 1)}
    if args.dry_run:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return 0

    key = "" if args.mock else read_key(args.key_file)
    if not args.mock and not key:
        sys.exit("API キーがありません (--key-file・GEMINI_API_KEY・~/.config/md-audiobook/gemini_key)")

    def run(line):
        target = out / line["file"]
        partial = target.with_suffix(".part.wav")
        if args.mock:
            mock_wav(line["text"], partial)
            partial.replace(target)
            return line
        partial.write_bytes(to_wav(call(request_body(model, line), key)))
        trim(partial)
        partial.replace(target)
        return line

    failed = []
    with cf.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run, line): line for line in todo}
        for done, future in enumerate(cf.as_completed(futures), 1):
            line = futures[future]
            try:
                future.result()
                log(f"[{done}/{len(todo)}] {line['scene']} {line['index'] + 1} 完了")
            except Exception as error:  # noqa: BLE001 — 失敗は一覧にして再実行で続ける
                where = "・".join(f"{same['scene']} {same['index'] + 1}" for same in users[line["file"]])
                failed.append(f"{where}: {error}")
                log(f"  失敗 {where}: {error}")

    timings = []
    for line in lines:
        path = out / line["file"]
        if path.exists():
            timings.append({"scene": line["scene"], "index": line["index"], "file": line["file"],
                            "seconds": seconds(path)})
    (out / "timings.json").write_text(
        json.dumps({"model": model, "mock": args.mock, "lines": timings}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    total = sum(item["seconds"] for item in timings)
    print(json.dumps(dict(plan, synthesized=len(todo) - len(failed), failed=failed,
                          speech_minutes=round(total / 60, 1)), ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
