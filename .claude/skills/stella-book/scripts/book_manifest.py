#!/usr/bin/env python3
"""本の作業フォルダーの book.json を作り、章を足す・直す。

  python3 book_manifest.py init <book_dir> --title 題名 [--author 著者 ...] [--language ja]
                                [--description 説明] [--cover cover.jpg]
  python3 book_manifest.py chapter <book_dir> --id ch01 --title "1章 …" --text chapters/01.md
                                [--audio audio/01.m4a] [--video video/01.mp4] [--no-audio] [--no-video]
  python3 book_manifest.py show <book_dir>

- 本の id (UUID) は init で最初に 1 度だけ作り、あとは変えない。STELLA は同じ id の zip を
  「同じ本の新しい版」として取り込み、中身の変わらないファイルを送り直さない。
- chapter は同じ id の章を上書きし、新しい id は末尾に足す (--position で場所を決められる)。
- 形の検査は pack_book.py と同じ規則 (STELLA の parseBookManifest)。ファイルの有無は pack_book.py が見る。
"""
import argparse
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
from pack_book import check_manifest, json_bytes  # noqa: E402


def load(book_dir):
    path = Path(book_dir) / "book.json"
    if not path.exists():
        sys.exit(f"{path} がありません。先に init を実行してください")
    return path, json.loads(path.read_text(encoding="utf-8"))


def save(path, manifest):
    path.write_bytes(json_bytes(manifest))


def report(manifest):
    errors = [e for e in check_manifest(manifest) if not e.startswith("chapters: 章を 1 つ以上")]
    if not isinstance(manifest, dict):
        print(json.dumps({"errors": errors}, ensure_ascii=False, indent=2))
        return 1
    chapters = manifest.get("chapters")
    chapters = chapters if isinstance(chapters, list) else []
    print(json.dumps({
        "id": manifest.get("id"),
        "title": manifest.get("title"),
        "cover": manifest.get("cover"),
        # 形の崩れた章 (オブジェクトでないもの) もそのまま見せる。エラーは errors に出る。
        "chapters": [{k: c.get(k) for k in ("id", "title", "text", "audio", "video")} if isinstance(c, dict) else c
                     for c in chapters],
        "errors": errors,
    }, ensure_ascii=False, indent=2))
    return 1 if errors else 0


def main():
    sys.stdout.reconfigure(errors="backslashreplace")
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    init = sub.add_parser("init")
    init.add_argument("book_dir")
    init.add_argument("--title", required=True)
    init.add_argument("--author", action="append", default=None)
    init.add_argument("--language")
    init.add_argument("--description")
    init.add_argument("--cover")
    chapter = sub.add_parser("chapter")
    chapter.add_argument("book_dir")
    chapter.add_argument("--id", required=True)
    chapter.add_argument("--title", required=True)
    chapter.add_argument("--text", required=True)
    chapter.add_argument("--audio")
    chapter.add_argument("--video")
    chapter.add_argument("--no-audio", action="store_true", help="この章の音声を外す")
    chapter.add_argument("--no-video", action="store_true", help="この章の動画を外す")
    chapter.add_argument("--position", type=int, help="新しい章を入れる位置 (0 始まり)")
    show = sub.add_parser("show")
    show.add_argument("book_dir")
    args = parser.parse_args()

    if args.command == "init":
        book_dir = Path(args.book_dir)
        book_dir.mkdir(parents=True, exist_ok=True)
        path = book_dir / "book.json"
        manifest = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {
            "format": "stella-book", "version": 1, "id": str(uuid.uuid4()),
            "title": args.title, "authors": [], "language": "ja", "cover": "cover.jpg", "chapters": [],
        }
        manifest["title"] = args.title
        if args.author is not None:
            manifest["authors"] = args.author
        if args.language:
            manifest["language"] = args.language
        if args.description is not None:
            manifest["description"] = args.description or None
        if args.cover:
            manifest["cover"] = args.cover
        save(path, manifest)
        return report(manifest)

    if args.command == "chapter":
        path, manifest = load(args.book_dir)
        if not isinstance(manifest, dict) or not isinstance(manifest.setdefault("chapters", []), list):
            sys.exit("book.json の形が崩れています (chapters は配列)。show で確かめて直してください")
        chapters = manifest["chapters"]
        current = next((c for c in chapters if isinstance(c, dict) and c.get("id") == args.id), None)
        entry = current if current is not None else {"id": args.id}
        entry["title"] = args.title
        entry["text"] = args.text
        if args.audio:
            entry["audio"] = args.audio
        if args.video:
            entry["video"] = args.video
        if args.no_audio:
            entry.pop("audio", None)
        if args.no_video:
            entry.pop("video", None)
        if current is None:
            chapters.insert(len(chapters) if args.position is None else args.position, entry)
        save(path, manifest)
        return report(manifest)

    _, manifest = load(args.book_dir)
    return report(manifest)


if __name__ == "__main__":
    sys.exit(main())
