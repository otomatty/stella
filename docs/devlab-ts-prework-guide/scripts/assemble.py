"""テンプレートと断片から章を組み立て、章のリンクを追加します。"""
import html
import json
from pathlib import Path
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
STAGES = Path(__file__).resolve().parents[3] / "packages/content/stages"


def chapter_readmes(ch):
    stage = STAGES / f"devlab-ts-ch{ch}"
    readmes = sorted(stage.glob("modules/u*/tasks/q*/README.md"), key=lambda path: path.parent.name)
    extra = stage / "modules/u100-extra/tasks/extra/README.md"
    if extra.is_file():
        readmes.append(extra)
    return readmes

def assemble_first(CH):
    s = (ROOT / "src/template.html").read_text(encoding="utf-8")


    def once(old, new):
        nonlocal s
        assert s.count(old) == 1, (old[:70], s.count(old))
        s = s.replace(old, new)


    # ---- q01 の id を章つきにする ----
    q01_start = s.index('<section class="sec" id="q01">')
    q01_end = s.index('<footer class="foot">')
    q01 = s[q01_start:q01_end]
    q01 = q01.replace('<section class="sec" id="q01">', '<section class="sec" id="c01-q01">')
    q01 = re.sub(r'<section class="q" id="q(\d+)">', r'<section class="q" id="c01-q01-\1">', q01)
    q01 = q01.replace('<section class="q" id="qa">', '<section class="q" id="c01-q01-a">')
    q01 = q01.rstrip() + "\n"

    # ---- 断片を読む ----
    frags = []
    for name in ["q02", "q03", "q04", "q05", "q06", "q07", "q08", "extra"]:
        f = ROOT / "src/fragments" / f"frag-01-{name}.html"
        t = f.read_text(encoding="utf-8").strip()
        assert t.startswith('<section class="sec"'), f
        for tag in ["section", "div", "details", "article", "pre", "code", "figure", "table", "dl", "ol", "ul"]:
            a = len(re.findall(rf"<{tag}[\s>]", t))
            b = t.count(f"</{tag}>")
            assert a == b, (f.name, tag, a, b)
        assert "<style" not in t and "<script" not in t, f
        frags.append(t)

    body_secs = [q01.strip()] + frags
    s = s[:q01_start] + "\n\n".join(body_secs) + "\n\n" + s[q01_end:]

    # ---- 目次を作り直す ----
    def chips(sec_html):
        out = []
        for m in re.finditer(r'<section class="q" id="([^"]+)">([\s\S]*?)(?=<section class="q" id=|\Z)', sec_html):
            qid, inner = m.group(1), m.group(2)
            n = re.search(r'<span class="q-n">([\s\S]*?)</span>', inner).group(1)
            label = re.sub(r"<[^>]+>", "", n).strip()
            none = '<h3 class="sub">' not in inner
            cls = ' class="none"' if none else ""
            out.append(f'<li><a{cls} href="#{qid}">{label}</a></li>')
        return out


    toc_rows = []
    for sec in body_secs:
        sid = re.search(r'<section class="sec" id="([^"]+)">', sec).group(1)
        h2 = re.sub(r"<[^>]+>", "", re.search(r"<h2>([\s\S]*?)</h2>", sec).group(1)).strip()
        items = "\n    ".join(chips(sec))
        toc_rows.append(f'  <h2><a class="toc-h" href="#{sid}">{h2}</a></h2>\n  <ul>\n    {items}\n  </ul>')

    toc_old = re.search(r'  <h2>01章 q01 の問題（薄い色は、新しい書き方が出てこない問題）</h2>\n  <ul>[\s\S]*?</ul>\n', s).group(0)
    s = s.replace(
        toc_old,
        '  <p class="toc-note">薄い色は、新しい書き方が出てこない問題です。</p>\n' + "\n".join(toc_rows) + "\n",
    )
    once(
        ".toc a.none { color: var(--soft); font-weight: 500; }",
        ".toc a.none { color: var(--soft); font-weight: 500; }\n"
        ".toc h2 a.toc-h { display: inline; border: 0; padding: 0; font-size: 15px; font-weight: 700; color: var(--ink); }\n"
        ".toc h2 a.toc-h:hover { color: var(--accent-ink); }\n"
        ".toc-note { font-size: 13px; color: var(--muted); }",
    )

    # ---- 見出し ----
    once("<title>TS事前課題 初出の解説 01章q01</title>", "<title>TS事前課題 書き方ガイド 01章</title>")
    once("<h1>書き方ガイド<br>前提と 01章 q01「letとconst」</h1>", "<h1>書き方ガイド<br>01章 値・型・変数</h1>")

    # ---- 出典（教材のリンク） ----
    links = []
    for readme in chapter_readmes(CH):
        for label, url in re.findall(r"- \[サバイバルTypeScript: ([^\]]+)\]\((https://typescriptbook\.jp/[^)]+)\)", readme.read_text(encoding="utf-8")):
            if url in [u for _, u in links]:
                continue
            name = re.sub(r"\s*\([^)]*\)$", "", label).removeprefix("発展問題 ")
            slug = url.rstrip("/").rsplit("/", 1)[-1]
            name = {"vars-problems": "varはもう使わない", "truthy-falsy-values": "truthy な値と falsy な値"}.get(slug, name)
            links.append((name, url))
    lis = "\n    ".join(f'<li><a href="{html.escape(u)}">{html.escape(l)}</a></li>' for l, u in links)
    s = re.sub(r"  <ul>\n    <li><a href=\"https://typescriptbook\.jp[\s\S]*?</ul>", f"  <ul>\n    {lis}\n  </ul>", s, count=1)

    return add_nav(s, CH)


def assemble_chapter(CH):
    CH1_URL = URLS["01"]
    stage = json.loads((STAGES / f"devlab-ts-ch{CH}/stage.json").read_text(encoding="utf-8"))
    chapter_name = stage["title"].removeprefix("開発ラボG 第1部 ")

    s = (ROOT / "src/template.html").read_text(encoding="utf-8")


    def once(old, new):
        nonlocal s
        assert s.count(old) == 1, (old[:70], s.count(old))
        s = s.replace(old, new)


    # ---- 断片を読む（番号順、発展問題は最後） ----
    paths = sorted((ROOT / "src/fragments").glob(f"frag-{CH}-q*.html")) + sorted((ROOT / "src/fragments").glob(f"frag-{CH}-extra.html"))
    assert paths, "no fragments"
    frags = []
    for f in paths:
        t = f.read_text(encoding="utf-8").strip()
        assert t.startswith('<section class="sec"'), f
        for tag in ["section", "div", "details", "article", "pre", "code", "figure", "table", "dl", "ol", "ul"]:
            a = len(re.findall(rf"<{tag}[\s>]", t))
            b = t.count(f"</{tag}>")
            assert a == b, (f.name, tag, a, b)
        assert "<style" not in t and "<script" not in t, f
        frags.append(t)

    # ---- 本文を差し替える（前提と q01 を外し、断片を並べる） ----
    start = s.index('<section class="sec" id="pre">')
    end = s.index('<footer class="foot">')
    s = s[:start] + "\n\n".join(frags) + "\n\n" + s[end:]

    # ---- 目次 ----
    def chips(sec_html):
        out = []
        for m in re.finditer(r'<section class="q" id="([^"]+)">([\s\S]*?)(?=<section class="q" id=|\Z)', sec_html):
            qid, inner = m.group(1), m.group(2)
            n = re.search(r'<span class="q-n">([\s\S]*?)</span>', inner).group(1)
            label = re.sub(r"<[^>]+>", "", n).strip()
            cls = ' class="none"' if '<h3 class="sub">' not in inner else ""
            out.append(f'<li><a{cls} href="#{qid}">{label}</a></li>')
        return out


    rows = []
    for sec in frags:
        sid = re.search(r'<section class="sec" id="([^"]+)">', sec).group(1)
        h2 = re.sub(r"<[^>]+>", "", re.search(r"<h2>([\s\S]*?)</h2>", sec).group(1)).strip()
        items = "\n    ".join(chips(sec))
        rows.append(f'  <h2><a class="toc-h" href="#{sid}">{h2}</a></h2>\n  <ul>\n    {items}\n  </ul>')
    toc = (
        '<nav class="toc" aria-label="目次">\n'
        '  <p class="toc-note">薄い色は、新しい書き方が出てこない問題です。</p>\n'
        + "\n".join(rows)
        + "\n</nav>"
    )
    s = re.sub(r'<nav class="toc" aria-label="目次">[\s\S]*?</nav>', lambda _: toc, s, count=1)
    once(
        ".toc a.none { color: var(--soft); font-weight: 500; }",
        ".toc a.none { color: var(--soft); font-weight: 500; }\n"
        ".toc h2 a.toc-h { display: inline; border: 0; padding: 0; font-size: 15px; font-weight: 700; color: var(--ink); }\n"
        ".toc h2 a.toc-h:hover { color: var(--accent-ink); }\n"
        ".toc-note { font-size: 13px; color: var(--muted); }",
    )

    # ---- 見出しと、01章の前提への案内 ----
    num, rest = chapter_name.split(" ", 1)
    once("<title>TS事前課題 初出の解説 01章q01</title>", f"<title>TS事前課題 書き方ガイド {num}</title>")
    once("<h1>書き方ガイド<br>前提と 01章 q01「letとconst」</h1>", f"<h1>書き方ガイド<br>{html.escape(chapter_name)}</h1>")
    once(
        '<p class="rules"><b>ルール</b>',
        f'<p class="rules"><b>前提</b>　関数の形の読み方や、このページのサンプルとヒントの読み方は、<a href="{CH1_URL}">01章のガイド</a>の「前提」にあります。前の章までに出た書き方は、そのまま使います。</p>\n  <p class="rules"><b>ルール</b>',
    )

    # ---- 出典 ----
    links = []
    for readme in chapter_readmes(CH):
        if not readme.exists():
            continue
        for label, url in re.findall(r"- \[サバイバルTypeScript: ([^\]]+)\]\((https://typescriptbook\.jp/[^)]+)\)", readme.read_text(encoding="utf-8")):
            if url in [u for _, u in links]:
                continue
            name = re.sub(r"\s*\([^)]*\)$", "", label).removeprefix("発展問題 ")
            names = [n for n, _ in links]
            if name in names:
                name = f"{name}（{url.rstrip('/').rsplit('/', 1)[-1]}）"
            links.append((name, url))
    lis = "\n    ".join(f'<li><a href="{html.escape(u)}">{html.escape(l)}</a></li>' for l, u in links)
    s = re.sub(r"  <ul>\n    <li><a href=\"https://typescriptbook\.jp[\s\S]*?</ul>", lambda _: f"  <ul>\n    {lis}\n  </ul>", s, count=1)

    return add_nav(s, CH)


URLS = {
    "01": "https://claude.ai/artifact/7ZJi5iYUv8931w41FMt4jy",
    "02": "https://claude.ai/artifact/4wjk432sjZaGyASSenuS8X",
    "03": "https://claude.ai/artifact/JGMp5nvpXxY3RPCKwWJwzS",
    "04": "https://claude.ai/artifact/Ad8VaUe4rDUu25FMyB56Ur",
    "05": "https://claude.ai/artifact/Nbk1traThMM7bKy3Q4pjtV",
    "06": "https://claude.ai/artifact/1uw2AmJc5nri6JL3HzPnVz",
    "07": "https://claude.ai/artifact/Vjo1wZMtdrH9UM4RzJerYH",
    "08": "https://claude.ai/artifact/Jx9b63d3U6exjjNcGr5GFi",
    "09": "https://claude.ai/artifact/NbwTkaPZFmUV8fBN13aucz",
}
NAMES = {
    "01": "値・型・変数", "02": "オブジェクト・配列・タプル", "03": "ユニオン型とそのほかの型",
    "04": "文と例外", "05": "関数", "06": "クラス", "07": "型の再利用とジェネリクス",
    "08": "非同期処理", "09": "組み込みの API とモジュール",
}


def add_nav(s, cur):
    s = re.sub(r'\n<nav class="chapters"[\s\S]*?</nav>\n', "\n", s)

    items = []
    for ch, name in NAMES.items():
        label = f'<b>{int(ch)}章</b><span>{name}</span>'
        if ch == cur:
            items.append(f'<li><span class="cur" aria-current="page">{label}</span></li>')
        elif URLS[ch]:
            items.append(f'<li><a href="{URLS[ch]}">{label}</a></li>')
    nav = '\n<nav class="chapters" aria-label="章">\n  <ul>\n    ' + "\n    ".join(items) + "\n  </ul>\n</nav>\n"
    s = s.replace("</header>\n", "</header>\n" + nav, 1)

    css = """
    /* 章の切り替え */
    .chapters li { display: flex; }
    .chapters a, .chapters .cur { flex: 1; }
    .chapters ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
    .chapters a, .chapters .cur { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border: 1px solid var(--rule); border-radius: 8px; text-decoration: none; color: var(--ink); font-size: 13px; line-height: 1.4; min-width: 0; }
    .chapters b { font-family: var(--font-label); font-size: 14px; }
    .chapters span span, .chapters a span { color: var(--muted); }
    .chapters a:hover { border-color: var(--accent); }
    .chapters .cur { border-color: var(--ink); background: var(--paper-2); }
    """
    if "/* 章の切り替え */" not in s:
        s = s.replace("</style>", textwrap.dedent(css) + "</style>", 1)
    return s
