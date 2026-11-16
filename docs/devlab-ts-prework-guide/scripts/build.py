"""全章を組み立て、ハイライトを焼き込んで pages/ に保存します。"""
from pathlib import Path
import subprocess
import tempfile

from assemble import assemble_first, assemble_chapter

ROOT = Path(__file__).resolve().parents[1]


def main():
    pages = ROOT / "pages"
    pages.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="stella-guide-") as temporary:
        for number in range(1, 10):
            chapter = f"{number:02}"
            assemble = assemble_first if number == 1 else assemble_chapter
            page = Path(temporary) / f"guide-{chapter}.html"
            page.write_text(assemble(chapter), encoding="utf-8")
            subprocess.run(["node", str(ROOT / "scripts/bake.mjs"), str(page)], check=True)
            (pages / page.name).write_bytes(page.read_bytes())
            print(f"Built {page.name}")


if __name__ == "__main__":
    main()
