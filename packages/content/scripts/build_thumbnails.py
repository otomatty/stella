# -*- coding: utf-8 -*-
"""講座サムネイル (courses/<slug>/thumbnail.webp) を生成する。

    python scripts/build_thumbnails.py [slug...]

一覧カードのサムネイルは全講座 (SPECS に登録した 10 講座) で 1 つのシリーズに見える必要があるため、画像を
手で描かずここで組み立てる。文言・色・モチーフだけを SPECS に書き、レイアウトは
全講座で共有する。

3 段構成:
  1. SPECS + courses/<slug>/course.json から 1600x900 の HTML を組む
  2. chromium (playwright) で開いて PNG を撮る
  3. Pillow で WebP (courses/<slug>/thumbnail.webp) に変換する

書体は Google Fonts から **使う文字だけ**を切り出して data URI で埋め込む。描画時に
ネットワークへ出ないので、同じ入力からは同じ画像が出る (取得時のみ通信する)。

規格 (16:9 / 最低幅 800px / 400KB 以内) は scripts/check_thumbnails.mjs が検査する。

外部ロゴは使わない。技術名は普通名称としての文字表記だけを置き、公式ロゴ・
ロゴフォント・シンボルマークは持ち込まない (商標の許諾が要る領域に入るため)。
"""
import base64
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parent.parent
COURSES = ROOT / "courses"

WIDTH, HEIGHT = 1600, 900
WEBP_QUALITY = 88

# 図解 skin (.claude/skills/diagram-design/references/style-guide.md) と同じトークン。
INK = "#0E0E10"
MUTED = "#5C5C66"
RULE = "#DDDDE2"
RULE_SOLID = "#B7B7BE"
PAPER = "#FFFFFF"
OK = "#16A34A"
NG = "#E5342B"

# course.json の color と対になる講座色。 強色は 1 枚につき 1 系統だけ使う。
COURSE_COLORS = {
    "indigo": {"strong": "#4F46E5", "tint": "rgba(79, 70, 229, 0.07)"},
    "green": {"strong": "#16A34A", "tint": "rgba(22, 163, 74, 0.07)"},
    "amber": {"strong": "#D97706", "tint": "rgba(217, 119, 6, 0.08)"},
    "slate": {"strong": "#475569", "tint": "rgba(71, 85, 105, 0.07)"},
}

# 本文の左カラム。 モチーフのパネルに食い込むと読めなくなるので、描画後に実測する。
TEXT_LEFT = 112
TEXT_MAX_WIDTH = 760
PANEL = {"left": 936, "top": 176, "size": 548}


def motif_typescript(c: str) -> str:
    """値に型が付く。 上段は素の値、下段は型注釈付き。"""
    rows = [
        # y, 変数名, 型, 強調するか
        (152, "count", "number", False),
        (308, "name", "string", True),
    ]
    out = []
    for y, name, type_name, strong in rows:
        type_fill = c if strong else PAPER
        type_stroke = c if strong else RULE_SOLID
        type_text = PAPER if strong else MUTED
        out.append(f"""
    <rect x="28" y="{y}" width="192" height="88" rx="12" fill="{PAPER}" stroke="{RULE_SOLID}" stroke-width="2.5"/>
    <text x="124" y="{y + 58}" text-anchor="middle" font-family="'Geist Mono', monospace" font-size="40" font-weight="500" fill="{INK}">{name}</text>
    <text x="240" y="{y + 58}" text-anchor="middle" font-family="'Geist Mono', monospace" font-size="40" font-weight="500" fill="{MUTED}">:</text>
    <rect x="260" y="{y}" width="260" height="88" rx="12" fill="{type_fill}" stroke="{type_stroke}" stroke-width="2.5"/>
    <text x="390" y="{y + 58}" text-anchor="middle" font-family="'Geist Mono', monospace" font-size="40" font-weight="500" fill="{type_text}">{type_name}</text>""")
    return "".join(out)


def motif_sql(c: str) -> str:
    """表から行を取り出す。 1 行だけが抽出された状態。"""
    columns = (72, 208, 344)  # 各列の左端 (列幅 96、区切り線は列の間)
    head_bars = "".join(
        f'<rect x="{x}" y="140" width="96" height="14" rx="7" fill="{PAPER}" opacity="0.9"/>'
        for x in columns
    )
    rows = []
    for i, y in enumerate((184, 272, 360)):
        picked = i == 1
        bar = c if picked else RULE
        if picked:
            rows.append(f'<rect x="40" y="{y}" width="468" height="88" fill="{c}" opacity="0.14"/>')
            rows.append(f'<rect x="40" y="{y}" width="10" height="88" fill="{c}"/>')
        rows.append(
            "".join(
                f'<rect x="{x}" y="{y + 37}" width="96" height="14" rx="7" fill="{bar}"/>'
                for x in columns
            )
        )
    # 区切り線はヘッダを横切らせない (黒帯の上に線が乗ると縞に見える)。
    lines = "".join(
        f'<line x1="{x}" y1="184" x2="{x}" y2="448" stroke="{RULE}" stroke-width="2"/>'
        for x in (188, 324)
    )
    return f"""
    <clipPath id="sql-table"><rect x="40" y="112" width="468" height="336" rx="16"/></clipPath>
    <g clip-path="url(#sql-table)">
      <rect x="40" y="112" width="468" height="336" fill="{PAPER}"/>
      <rect x="40" y="112" width="468" height="72" fill="{INK}"/>
      {head_bars}
      {"".join(rows)}
      {lines}
    </g>
    <rect x="40" y="112" width="468" height="336" rx="16" fill="none" stroke="{RULE_SOLID}" stroke-width="2.5"/>
    <path d="M 274 460 L 274 492" stroke="{c}" stroke-width="4" fill="none"/>
    <path d="M 258 484 L 274 504 L 290 484 Z" fill="{c}"/>"""


def motif_html_css(c: str) -> str:
    """箱の入れ子。 外から margin / border / 中身。"""
    return f"""
    <rect x="48" y="96" width="452" height="332" rx="16" fill="none" stroke="{RULE_SOLID}" stroke-width="2.5" stroke-dasharray="12 10"/>
    <rect x="104" y="152" width="340" height="220" rx="12" fill="{PAPER}" stroke="{INK}" stroke-width="3"/>
    <rect x="156" y="204" width="236" height="116" rx="8" fill="{c}"/>
    <text x="274" y="482" text-anchor="middle" font-family="'Geist Mono', monospace" font-size="36" font-weight="500" fill="{MUTED}">&lt;div&gt;</text>"""


def motif_python_testing(c: str) -> str:
    """テストの結果が並ぶ。 通ったものと落ちたもの。"""
    rows = [(112, OK), (232, OK), (352, NG)]
    out = []
    for y, mark in rows:
        glyph = (
            f'<path d="M 76 {y + 48} l 12 14 l 24 -28" stroke="{PAPER}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
            if mark == OK
            else f'<path d="M 78 {y + 36} l 28 28 M 106 {y + 36} l -28 28" stroke="{PAPER}" stroke-width="5" fill="none" stroke-linecap="round"/>'
        )
        out.append(f"""
    <rect x="24" y="{y}" width="500" height="96" rx="12" fill="{PAPER}" stroke="{RULE}" stroke-width="2.5"/>
    <circle cx="92" cy="{y + 48}" r="28" fill="{mark}"/>
    {glyph}
    <rect x="152" y="{y + 34}" width="216" height="12" rx="6" fill="{RULE}"/>
    <rect x="152" y="{y + 58}" width="120" height="12" rx="6" fill="{RULE}"/>""")
    return "".join(out)


def motif_fe_kamoku_a(c: str) -> str:
    """9 分野を 1 つずつ固める。 塗られた 1 マスが今やっているところ。"""
    out = []
    for row in range(3):
        for col in range(3):
            x = 52 + col * 156
            y = 52 + row * 156
            filled = row == 1 and col == 1
            fill = c if filled else PAPER
            stroke = c if filled else RULE
            bar = PAPER if filled else RULE
            out.append(f"""
    <rect x="{x}" y="{y}" width="132" height="132" rx="16" fill="{fill}" stroke="{stroke}" stroke-width="2.5"/>
    <rect x="{x + 28}" y="{y + 56}" width="76" height="10" rx="5" fill="{bar}" opacity="{0.9 if filled else 1}"/>
    <rect x="{x + 28}" y="{y + 78}" width="48" height="10" rx="5" fill="{bar}" opacity="{0.9 if filled else 1}"/>""")
    return "".join(out)


def motif_fe_kamoku_b(c: str) -> str:
    """擬似言語を追う。 処理と分岐と繰り返し。"""
    return f"""
    <rect x="154" y="48" width="240" height="88" rx="12" fill="{PAPER}" stroke="{INK}" stroke-width="3"/>
    <rect x="194" y="80" width="160" height="12" rx="6" fill="{RULE}"/>
    <rect x="194" y="102" width="104" height="12" rx="6" fill="{RULE}"/>
    <path d="M 274 174 L 386 274 L 274 374 L 162 274 Z" fill="{PAPER}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="222" y="268" width="104" height="12" rx="6" fill="{RULE}"/>
    <path d="M 274 136 L 274 166" stroke="{INK}" stroke-width="3" fill="none"/>
    <path d="M 264 158 L 274 172 L 284 158 Z" fill="{INK}"/>
    <path d="M 274 374 L 274 404" stroke="{INK}" stroke-width="3" fill="none"/>
    <path d="M 264 396 L 274 410 L 284 396 Z" fill="{INK}"/>
    <rect x="154" y="412" width="240" height="88" rx="12" fill="{PAPER}" stroke="{INK}" stroke-width="3"/>
    <rect x="194" y="444" width="160" height="12" rx="6" fill="{RULE}"/>
    <rect x="194" y="466" width="104" height="12" rx="6" fill="{RULE}"/>
    <path d="M 386 274 L 470 274 L 470 92 L 402 92" stroke="{c}" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <path d="M 410 82 L 396 92 L 410 102 Z" fill="{c}"/>"""


def motif_git(c: str) -> str:
    """枝分かれして合流するコミットグラフ。 main の列から枝が出て、コミットを積んで戻る。"""
    main_y = 372
    branch_y = 204
    commits = "".join(
        f'<circle cx="{x}" cy="{main_y}" r="22" fill="{PAPER}" stroke="{INK}" stroke-width="4"/>'
        for x in (96, 200, 452)
    )
    branch_commits = "".join(
        f'<circle cx="{x}" cy="{branch_y}" r="22" fill="{c}" stroke="{c}" stroke-width="4"/>'
        for x in (272, 344)
    )
    return f"""
    <path d="M 48 {main_y} L 500 {main_y}" stroke="{INK}" stroke-width="4" fill="none"/>
    <path d="M 200 {main_y} C 200 260 224 {branch_y} 272 {branch_y}" stroke="{c}" stroke-width="4" fill="none"/>
    <path d="M 272 {branch_y} L 344 {branch_y}" stroke="{c}" stroke-width="4" fill="none"/>
    <path d="M 344 {branch_y} C 408 {branch_y} 452 260 452 {main_y}" stroke="{c}" stroke-width="4" fill="none"/>
    {commits}
    {branch_commits}
    <circle cx="452" cy="{main_y}" r="34" fill="none" stroke="{c}" stroke-width="4"/>"""


def motif_test_design(c: str) -> str:
    """仕様の範囲と境界値。 帯が仕様の範囲、その端をまたぐ 2 点だけを試す。"""
    line_y = 252
    boundary = 272
    points = ((200, "3,000"), (344, "3,001"))
    ticks = "".join(
        f'<line x1="{x}" y1="{line_y - 16}" x2="{x}" y2="{line_y + 16}" stroke="{RULE_SOLID}" stroke-width="3"/>'
        for x in (56, 128, 416, 488)
    )
    marks = "".join(
        f'<circle cx="{x}" cy="{line_y}" r="28" fill="{c}" stroke="{PAPER}" stroke-width="5"/>'
        f'<text x="{x}" y="412" text-anchor="middle" font-family="\'Geist Mono\', monospace"'
        f' font-size="40" font-weight="500" fill="{INK}">{label}</text>'
        for x, label in points
    )
    return f"""
    <rect x="56" y="{line_y - 44}" width="{boundary - 56}" height="88" fill="{c}" opacity="0.12"/>
    <line x1="56" y1="{line_y}" x2="492" y2="{line_y}" stroke="{INK}" stroke-width="4"/>
    {ticks}
    <line x1="{boundary}" y1="124" x2="{boundary}" y2="348" stroke="{INK}" stroke-width="3" stroke-dasharray="12 10"/>
    {marks}"""


def motif_ai_fluency(c: str) -> str:
    """4つの局面を回す。 任せる→伝える→見極める→責任を持つ、の循環。今いる 1 マスだけ塗る。"""
    boxes = [
        # x, y, 塗るか
        (60, 76, True),
        (312, 76, False),
        (312, 336, False),
        (60, 336, False),
    ]
    out = []
    for x, y, filled in boxes:
        fill = c if filled else PAPER
        stroke = c if filled else RULE_SOLID
        bar = PAPER if filled else RULE
        out.append(f"""
    <rect x="{x}" y="{y}" width="176" height="136" rx="16" fill="{fill}" stroke="{stroke}" stroke-width="2.5"/>
    <rect x="{x + 36}" y="{y + 56}" width="104" height="12" rx="6" fill="{bar}" opacity="{0.9 if filled else 1}"/>
    <rect x="{x + 36}" y="{y + 80}" width="68" height="12" rx="6" fill="{bar}" opacity="{0.9 if filled else 1}"/>""")
    arrows = f"""
    <path d="M 248 144 L 300 144" stroke="{INK}" stroke-width="4" fill="none"/>
    <path d="M 292 134 L 306 144 L 292 154 Z" fill="{INK}"/>
    <path d="M 400 224 L 400 324" stroke="{INK}" stroke-width="4" fill="none"/>
    <path d="M 390 316 L 400 330 L 410 316 Z" fill="{INK}"/>
    <path d="M 300 404 L 248 404" stroke="{INK}" stroke-width="4" fill="none"/>
    <path d="M 256 394 L 242 404 L 256 414 Z" fill="{INK}"/>
    <path d="M 148 324 L 148 224" stroke="{c}" stroke-width="4" fill="none"/>
    <path d="M 138 232 L 148 218 L 158 232 Z" fill="{c}"/>"""
    return "".join(out) + arrows


def motif_claude_chat(c: str) -> str:
    """チャットの往復。 依頼の吹き出しと返答の吹き出しが交互に並ぶ。"""
    return f"""
    <rect x="200" y="72" width="320" height="112" rx="20" fill="{c}"/>
    <path d="M 500 184 L 516 208 L 468 184 Z" fill="{c}"/>
    <rect x="232" y="104" width="200" height="12" rx="6" fill="{PAPER}" opacity="0.9"/>
    <rect x="232" y="132" width="144" height="12" rx="6" fill="{PAPER}" opacity="0.9"/>
    <rect x="28" y="232" width="356" height="136" rx="20" fill="{PAPER}" stroke="{RULE_SOLID}" stroke-width="2.5"/>
    <path d="M 48 366 L 32 392 L 80 366 Z" fill="{PAPER}" stroke="{RULE_SOLID}" stroke-width="2.5"/>
    <rect x="60" y="264" width="248" height="12" rx="6" fill="{RULE}"/>
    <rect x="60" y="292" width="292" height="12" rx="6" fill="{RULE}"/>
    <rect x="60" y="320" width="180" height="12" rx="6" fill="{RULE}"/>
    <rect x="240" y="416" width="280" height="96" rx="20" fill="{PAPER}" stroke="{c}" stroke-width="2.5"/>
    <rect x="272" y="444" width="168" height="12" rx="6" fill="{c}" opacity="0.55"/>
    <rect x="272" y="472" width="120" height="12" rx="6" fill="{c}" opacity="0.55"/>"""


# 講座ごとに変えるのは文言とモチーフだけ。 色と eyebrow は course.json から取る。
SPECS = {
    "typescript-basics": {
        "title": "TypeScript",
        "title_size": 132,
        "subtitle": "入門研修",
        "motif": motif_typescript,
    },
    "sql-basics": {
        "title": "SQL",
        "title_size": 168,
        "subtitle": "入門研修",
        "motif": motif_sql,
    },
    "html-css-basics": {
        "title": "HTML / CSS",
        "title_size": 116,
        "subtitle": "入門研修",
        "motif": motif_html_css,
    },
    "python-testing-ci-basics": {
        "title": "Python",
        "title_size": 152,
        "subtitle": "テスト自動化と CI 入門",
        "motif": motif_python_testing,
    },
    "test-design-basics": {
        "title": "テスト設計",
        "title_size": 132,
        "subtitle": "品質保証 入門研修",
        "motif": motif_test_design,
    },
    "git-basics": {
        "title": "Git",
        "title_size": 168,
        "subtitle": "入門研修",
        "motif": motif_git,
    },
    "fe-kamoku-a": {
        "title": "科目A",
        "title_size": 148,
        "subtitle": "基本情報技術者試験",
        "motif": motif_fe_kamoku_a,
    },
    "fe-kamoku-b": {
        "title": "科目B",
        "title_size": 148,
        "subtitle": "基本情報技術者試験",
        "motif": motif_fe_kamoku_b,
    },
    "ai-fluency-basics": {
        "title": "AI駆動開発",
        "title_size": 116,
        "subtitle": "の考え方",
        "motif": motif_ai_fluency,
    },
    "claude-chat-basics": {
        "title": "Claude",
        "title_size": 152,
        "subtitle": "チャット入門",
        "motif": motif_claude_chat,
    },
}

# Google Fonts から切り出す書体。 style-guide.md が許す 3 書体だけ。
FONT_REQUESTS = [("Figtree", 500), ("Figtree", 700), ("Noto Sans JP", 500), ("Noto Sans JP", 700), ("Geist Mono", 500)]
FONT_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
ASCII = "".join(chr(i) for i in range(0x20, 0x7F))


def fetch(url: str) -> bytes:
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": FONT_UA}), timeout=60).read()


def font_face_css(text: str) -> str:
    """使う文字だけの woff2 を data URI で埋め込む @font-face 群を作る。"""
    blocks = []
    for family, weight in FONT_REQUESTS:
        query = urllib.parse.urlencode({"family": f"{family}:wght@{weight}", "text": text})
        css = fetch(f"https://fonts.googleapis.com/css2?{query}").decode("utf-8")
        match = re.search(r"src:\s*url\((https://[^)]+)\)", css)
        if not match:
            raise SystemExit(f"Google Fonts から {family} {weight} の woff2 を取れませんでした")
        woff2 = base64.b64encode(fetch(match.group(1))).decode("ascii")
        blocks.append(
            f"@font-face{{font-family:'{family}';font-style:normal;font-weight:{weight};"
            f"src:url(data:font/woff2;base64,{woff2}) format('woff2');}}"
        )
    return "".join(blocks)


def page_html(spec: dict, config: dict, fonts: str) -> str:
    color = COURSE_COLORS[config.get("color", "indigo")]
    strong, tint = color["strong"], color["tint"]
    motif = spec["motif"](strong)
    panel = PANEL
    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><style>
{fonts}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:{WIDTH}px;height:{HEIGHT}px;background:{PAPER};overflow:hidden}}
.canvas{{position:relative;width:{WIDTH}px;height:{HEIGHT}px;background:{PAPER}}}
.stripes{{position:absolute;inset:0;background-image:repeating-linear-gradient(45deg,{tint} 0 18px,{PAPER} 18px 36px)}}
.baseline{{position:absolute;left:{TEXT_LEFT}px;top:800px;width:{WIDTH - TEXT_LEFT * 2}px;height:2px;background:{RULE}}}
.bar{{position:absolute;left:{TEXT_LEFT}px;top:236px;width:88px;height:12px;border-radius:6px;background:{strong}}}
.eyebrow{{position:absolute;left:{TEXT_LEFT}px;top:288px;font-family:'Noto Sans JP',sans-serif;font-weight:500;
  font-size:30px;letter-spacing:.18em;color:{MUTED};white-space:nowrap}}
.title{{position:absolute;left:{TEXT_LEFT}px;top:348px;font-family:'Figtree','Noto Sans JP',sans-serif;font-weight:700;
  font-size:{spec["title_size"]}px;line-height:1;letter-spacing:-.02em;color:{INK};white-space:nowrap}}
.subtitle{{position:absolute;left:{TEXT_LEFT}px;top:560px;font-family:'Noto Sans JP','Figtree',sans-serif;font-weight:500;
  font-size:44px;color:{MUTED};white-space:nowrap}}
.panel{{position:absolute;left:{panel["left"]}px;top:{panel["top"]}px;width:{panel["size"]}px;height:{panel["size"]}px;
  border-radius:32px;background:{tint}}}
.panel svg{{display:block}}
</style></head><body>
<div class="canvas">
  <div class="stripes"></div>
  <div class="bar"></div>
  <div class="eyebrow">{config["category"]}</div>
  <div class="title">{spec["title"]}</div>
  <div class="subtitle">{spec["subtitle"]}</div>
  <div class="panel"><svg width="{panel["size"]}" height="{panel["size"]}" viewBox="0 0 548 548" xmlns="http://www.w3.org/2000/svg">{motif}</svg></div>
  <div class="baseline"></div>
</div>
</body></html>"""


OVERFLOW_JS = """
() => [...document.querySelectorAll('.title, .subtitle, .eyebrow')]
  .map(el => ({ cls: el.className, width: el.getBoundingClientRect().width, text: el.textContent }))
"""


def build(slugs: list[str]) -> None:
    targets = []
    for slug in slugs:
        config_file = COURSES / slug / "course.json"
        if not config_file.exists():
            raise SystemExit(f"{slug}: course.json がありません")
        targets.append((slug, SPECS[slug], json.loads(config_file.read_text("utf-8"))))

    text = ASCII + "".join(
        spec["title"] + spec["subtitle"] + config["category"] for _, spec, config in targets
    )
    fonts = font_face_css("".join(sorted(set(text))))

    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=1)
        for slug, spec, config in targets:
            page.set_content(page_html(spec, config, fonts))
            page.evaluate("() => document.fonts.ready")
            for box in page.evaluate(OVERFLOW_JS):
                if box["width"] > TEXT_MAX_WIDTH:
                    problems.append(
                        f"{slug}: {box['cls']} 「{box['text']}」が {round(box['width'])}px — "
                        f"左カラム {TEXT_MAX_WIDTH}px を超えてモチーフに重なります"
                    )
            png = page.screenshot(type="png")
            out = COURSES / slug / "thumbnail.webp"
            Image.open(BytesIO(png)).convert("RGB").save(out, "WEBP", quality=WEBP_QUALITY, method=6)
            print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024}KB")
        browser.close()

    if problems:
        print("\nはみ出しがあります:\n", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    requested = sys.argv[1:] or list(SPECS)
    unknown = [slug for slug in requested if slug not in SPECS]
    if unknown:
        raise SystemExit(f"SPECS にない講座です: {', '.join(unknown)}")
    build(requested)
