#!/usr/bin/env python3
"""本の作業フォルダーを、STELLA の本棚が取り込める stella-book 形式の zip にまとめる。

  python3 pack_book.py <book_dir> -o book.zip [--check]

<book_dir> の中身 (book.json が指すファイルと images/ の画像だけを入れる):
  book.json            形式・id (UUID)・題名・著者・言語・説明・表紙・章の一覧
  cover.jpg など       表紙 (.webp / .jpg / .jpeg / .png、10MB まで)
  chapters/*.md        本文 (2MB まで)
  audio/*.m4a|mp3      朗読 (任意、1GB まで)
  video/*.mp4          解説動画 (任意、2GB まで)
  images/*             本文の図 (任意、10MB まで)

検査の規則は STELLA の @stella/shared/library/book-package (parseBookManifest・planPackageFiles)
と同じ。食い違うと取り込みの画面で止まるので、規則を変えるときは両方を直す。
本文の HTML コメント (文字起こしのページ印 <!-- p.N --> など) は、本棚では文字のまま表示されるので外す。
音声・動画・画像は無圧縮 (もう圧縮されている)、文字は deflate で入れる。標準ライブラリだけで動く。
"""
import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

MiB = 1024 * 1024
GiB = 1024 * MiB
LIMITS = {
    "manifest": 1 * MiB, "text": 2 * MiB, "image": 10 * MiB, "cover": 10 * MiB,
    "audio": 1 * GiB, "video": 2 * GiB, "book": 4 * GiB, "files": 1000, "chapters": 300,
}
EXTENSIONS = {
    "md": ("text",), "m4a": ("audio",), "mp3": ("audio",), "mp4": ("video",),
    "png": ("cover", "image"), "jpg": ("cover", "image"), "jpeg": ("cover", "image"),
    "webp": ("cover", "image"), "gif": ("image",),
}
LABEL = {"cover": "表紙", "text": "本文", "audio": "音声", "video": "動画", "image": "画像"}
EXPECTED = {"cover": ".webp / .jpg / .jpeg / .png", "text": ".md", "audio": ".m4a / .mp3",
            "video": ".mp4", "image": ".png / .jpg / .jpeg / .webp / .gif"}
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
CHAPTER_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
LANGUAGE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$")
TOP_KEYS = {"format", "version", "id", "title", "authors", "language", "description", "cover", "chapters"}
CHAPTER_KEYS = {"id", "title", "text", "audio", "video"}
COMMENT = re.compile(r"<!--.*?-->", re.S)
RAW_HTML = re.compile(r"</?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*)?/?>")


def extension(path):
    name = path.rsplit("/", 1)[-1]
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def allowed(path, kind):
    return kind in EXTENSIONS.get(extension(path), ())


def safe_path(path):
    """zip の中の相対パスとして安全か (/ 区切り・先頭の / なし・\\ なし・空や . や .. の部分なし)。"""
    if not isinstance(path, str) or not path or len(path) > 400 or "\\" in path or path.startswith("/"):
        return False
    if any(ord(c) < 32 for c in path):
        return False
    return all(part not in ("", ".", "..") for part in path.split("/"))


def text_field(value, low, high):
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value if low <= len(value) <= high else None


def check_manifest(manifest):
    """parseBookManifest と同じ規則。エラーの一覧を返す。"""
    errors = []
    if not isinstance(manifest, dict):
        return ["book.json は JSON のオブジェクトにしてください"]
    errors += [f"{key}: 知らない項目です" for key in manifest if key not in TOP_KEYS]
    if manifest.get("format") != "stella-book":
        errors.append('format: "stella-book" を指定してください')
    if manifest.get("version") != 1:
        errors.append("version: 1 を指定してください")
    if not (isinstance(manifest.get("id"), str) and UUID.match(manifest["id"])):
        errors.append("id: UUID を指定してください")
    if not text_field(manifest.get("title"), 1, 200):
        errors.append("title: 1〜200 文字で指定してください")
    authors = manifest.get("authors", [])
    if not isinstance(authors, list) or len(authors) > 10:
        errors.append("authors: 10 人までの文字列の配列にしてください")
    else:
        errors += [f"authors[{i}]: 1〜100 文字で指定してください"
                   for i, a in enumerate(authors) if not text_field(a, 1, 100)]
    language = manifest.get("language", "ja")
    if not (isinstance(language, str) and len(language) <= 35 and LANGUAGE.match(language)):
        errors.append('language: "ja" や "en-US" の形で指定してください')
    description = manifest.get("description")
    if description is not None and (not isinstance(description, str) or len(description.strip()) > 2000):
        errors.append("description: 2000 文字以内の文字列にしてください")

    def file_field(value, field, kind):
        if not safe_path(value):
            errors.append(f"{field}: zip の中の相対パス (例 chapters/01.md) を指定してください")
        elif value == "book.json":
            errors.append(f"{field}: book.json は指定できません")
        elif not allowed(value, kind):
            errors.append(f"{field}: {LABEL[kind]}に使えない形式です ({EXPECTED[kind]})")

    file_field(manifest.get("cover"), "cover", "cover")
    chapters = manifest.get("chapters")
    if not isinstance(chapters, list) or not chapters:
        errors.append("chapters: 章を 1 つ以上並べてください")
    elif len(chapters) > LIMITS["chapters"]:
        errors.append(f"chapters: 章は {LIMITS['chapters']} 個までです")
    else:
        seen = set()
        for i, chapter in enumerate(chapters):
            at = f"chapters[{i}]"
            if not isinstance(chapter, dict):
                errors.append(f"{at}: オブジェクトにしてください")
                continue
            errors += [f"{at}.{key}: 知らない項目です" for key in chapter if key not in CHAPTER_KEYS]
            cid = chapter.get("id")
            if not (isinstance(cid, str) and CHAPTER_ID.match(cid)):
                errors.append(f"{at}.id: 英小文字・数字・-・_ の 64 文字以内で指定してください (例 ch01)")
            elif cid in seen:
                errors.append(f'{at}.id: "{cid}" が重複しています')
            else:
                seen.add(cid)
            if not text_field(chapter.get("title"), 1, 200):
                errors.append(f"{at}.title: 1〜200 文字で指定してください")
            file_field(chapter.get("text"), f"{at}.text", "text")
            for key, kind in (("audio", "audio"), ("video", "video")):
                if chapter.get(key) is not None:
                    file_field(chapter[key], f"{at}.{key}", kind)
    return errors


def plan_files(manifest, book_dir):
    """planPackageFiles と同じ規則で、zip に入れるファイルを選ぶ。(files, ignored, errors)。"""
    entries = {}
    for path in sorted(book_dir.rglob("*")):
        if path.is_file():
            entries[path.relative_to(book_dir).as_posix()] = path.stat().st_size
    files, errors = {}, []

    def want(path, kind, field):
        if path in files:
            if files[path] != kind:
                errors.append(f"{field}: {path} は別の種類として使われています")
            return
        if path not in entries:
            errors.append(f"{field}: {path} がありません")
            return
        size = entries[path]
        if size == 0:
            errors.append(f"{field}: {path} が空です")
        elif size > LIMITS[kind]:
            errors.append(f"{field}: {path} が大きすぎます ({LABEL[kind]}は {LIMITS[kind] // MiB}MB まで)")
        else:
            files[path] = kind

    want(manifest["cover"], "cover", "cover")
    for i, chapter in enumerate(manifest["chapters"]):
        want(chapter["text"], "text", f"chapters[{i}].text")
        for key in ("audio", "video"):
            if chapter.get(key):
                want(chapter[key], key, f"chapters[{i}].{key}")
    ignored = []
    for path, size in entries.items():
        if path == "book.json" or path in files:
            continue
        noise = any(part == "__MACOSX" or part.startswith(".") for part in path.split("/"))
        if not noise and safe_path(path) and path.startswith("images/") and allowed(path, "image"):
            if 0 < size <= LIMITS["image"]:
                files[path] = "image"
            else:
                errors.append(f"{path}: 画像は 10MB までです")
            continue
        ignored.append(path)
    total = sum(entries[p] for p in files)
    if len(files) > LIMITS["files"]:
        errors.append(f"ファイルは 1 冊 {LIMITS['files']} 個までです")
    if total > LIMITS["book"]:
        errors.append("1 冊の合計は 4GB までです")
    return files, ignored, errors


def same_title(a, b):
    return re.sub(r"\s+", "", a) == re.sub(r"\s+", "", b)


def clean_markdown(text, chapter_title):
    """HTML コメントと、章の題名と同じ先頭の見出しを外す。残った生の HTML タグの数も返す
    (本棚では文字のまま表示される。章の題名は本棚の画面が見出しとして出す)。"""
    cleaned, comments = COMMENT.subn("", text)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).lstrip("\n")
    first = re.match(r"#\s+(.+?)\s*(\n|$)", cleaned)
    heading = bool(first and same_title(first.group(1), chapter_title))
    if heading:
        cleaned = cleaned[first.end():].lstrip("\n")
    in_code, tags = False, 0
    for line in cleaned.splitlines():
        if line.lstrip().startswith("```"):
            in_code = not in_code
        elif not in_code:
            tags += len(RAW_HTML.findall(re.sub(r"`[^`]*`", "", line)))
    return cleaned, comments, tags, heading


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("book_dir")
    parser.add_argument("-o", "--output")
    parser.add_argument("--check", action="store_true", help="検査だけ (zip を作らない)")
    args = parser.parse_args()
    book_dir = Path(args.book_dir)
    manifest_path = book_dir / "book.json"
    if not manifest_path.exists():
        sys.exit(f"{manifest_path} がありません")
    if manifest_path.stat().st_size > LIMITS["manifest"]:
        sys.exit("book.json は 1MB までです")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors = check_manifest(manifest)
    files, ignored, plan_errors = ({}, [], []) if errors else plan_files(manifest, book_dir)
    errors += plan_errors
    report = {"ok": not errors, "errors": errors, "ignored": ignored}
    if errors:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    texts = {}
    warnings = []
    titles = {c["text"]: c["title"] for c in manifest["chapters"]}
    for path, kind in files.items():
        if kind == "text":
            cleaned, comments, tags, heading = clean_markdown(
                (book_dir / path).read_text(encoding="utf-8"), titles.get(path, ""))
            texts[path] = cleaned.encode("utf-8")
            if heading:
                warnings.append(f"{path}: 章の題名と同じ先頭の見出しを外しました")
            if comments:
                warnings.append(f"{path}: HTML コメント {comments} 個を外しました")
            if tags:
                warnings.append(f"{path}: 生の HTML タグが {tags} 個あります (本棚では文字のまま表示されます)")
    report.update({
        "warnings": warnings,
        "title": manifest["title"],
        "chapters": len(manifest["chapters"]),
        "audio": sum(1 for c in manifest["chapters"] if c.get("audio")),
        "video": sum(1 for c in manifest["chapters"] if c.get("video")),
        "files": len(files) + 1,
        "bytes": sum(len(texts[p]) if p in texts else (book_dir / p).stat().st_size for p in files),
    })
    if args.check or not args.output:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    out = Path(args.output)
    with zipfile.ZipFile(out, "w") as archive:
        archive.writestr("book.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                         compress_type=zipfile.ZIP_DEFLATED)
        for path, kind in files.items():
            if path in texts:
                archive.writestr(path, texts[path], compress_type=zipfile.ZIP_DEFLATED)
            else:
                archive.write(book_dir / path, path, compress_type=zipfile.ZIP_STORED)
    report["output"] = str(out)
    report["zip_bytes"] = out.stat().st_size
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
