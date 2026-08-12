# -*- coding: utf-8 -*-
"""図解HTMLからSVGとPNGを生成し、日本語のはみ出しを検査する。

    python scripts/diagram_export.py [対象パス...]
    python scripts/diagram_export.py --self-test

3段構成:
  1. assets/*.html から <svg> を抽出して assets/<名前>.svg を書く(フォント@importを注入)
  2. assets/*.svg を chromium で開いて assets/<名前>.diagram.png を書く(透過・2倍)
  3. 2の描画中に <text> が親 <rect> をはみ出していないか検査する

入力より新しい出力があればスキップする。このスクリプト自身が変わったら作り直す。
"""
import re
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parent.parent
SCRIPT_MTIME = SCRIPT.stat().st_mtime

FONT_IMPORT = (
    "@import url('https://fonts.googleapis.com/css2?"
    "family=Noto+Sans+JP:wght@400;500;700;900"
    "&family=Figtree:wght@400;500;600"
    "&family=Geist+Mono:wght@400;500&display=swap');"
)
SVG_RE = re.compile(r"<svg\b.*?</svg>", re.S)

# ponytail: 親コンテナは rect / circle / ellipse の外接矩形を候補にし、
# 「テキストの中心を含む最小の候補」を親として近似する。中心を含む候補が
# 無い場合(はみ出しが大きくテキスト中心が枠の外に出た場合)は、bboxが
# 重なる候補の最小のものにフォールバックする。<path> は形が任意で外接矩形が
# 意味を持たないため対象外(手書きの複雑な枠は目視確認に頼る)。
# 図の入れ子が3階層までという制約があるので実用上これで足りる。
OVERFLOW_JS = """
() => {
  const svg = document.querySelector('svg');
  const vb = svg.viewBox.baseVal;
  const rects = [...svg.querySelectorAll('rect')].map(r => ({
    x: +r.getAttribute('x') || 0, y: +r.getAttribute('y') || 0,
    w: +r.getAttribute('width') || 0, h: +r.getAttribute('height') || 0,
  }));
  const circles = [...svg.querySelectorAll('circle')].map(c => {
    const cx = +c.getAttribute('cx') || 0, cy = +c.getAttribute('cy') || 0;
    const r = +c.getAttribute('r') || 0;
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  });
  const ellipses = [...svg.querySelectorAll('ellipse')].map(e => {
    const cx = +e.getAttribute('cx') || 0, cy = +e.getAttribute('cy') || 0;
    const rx = +e.getAttribute('rx') || 0, ry = +e.getAttribute('ry') || 0;
    return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
  });
  const holders_all = [...rects, ...circles, ...ellipses];
  const bad = [];
  for (const t of svg.querySelectorAll('text')) {
    const b = t.getBBox();
    const label = (t.textContent || '').slice(0, 20);
    if (b.x < vb.x - 1 || b.y < vb.y - 1 ||
        b.x + b.width > vb.x + vb.width + 1 ||
        b.y + b.height > vb.y + vb.height + 1) {
      bad.push(`viewBoxからはみ出し: "${label}"`);
      continue;
    }
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    let holders = holders_all.filter(r =>
      cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
    if (!holders.length) {
      // 死角A: はみ出しが大きいとテキスト中心が枠の外に出る。
      // bboxが重なる候補にフォールバックする。
      holders = holders_all.filter(r =>
        b.x < r.x + r.w && b.x + b.width > r.x &&
        b.y < r.y + r.h && b.y + b.height > r.y);
    }
    if (!holders.length) continue;
    holders.sort((a, c) => a.w * a.h - c.w * c.h);
    const r = holders[0];
    if (b.x < r.x - 2 || b.x + b.width > r.x + r.w + 2 ||
        b.y < r.y - 2 || b.y + b.height > r.y + r.h + 2) {
      bad.push(`枠からはみ出し: "${label}"`);
    }
  }
  return bad;
}
"""


def collect(root, suffix):
    if root.is_file():
        return [root] if root.suffix == suffix else []
    return sorted(p for p in root.rglob("*" + suffix) if p.parent.name == "assets")


def newer_than(out, *ins):
    if not out.exists():
        return False
    return out.stat().st_mtime > max(SCRIPT_MTIME, *(i.stat().st_mtime for i in ins))


def extract_svg(html_path, svg_path):
    """HTMLから<svg>を取り出し、単体で描画できるSVGとして書き出す。"""
    m = SVG_RE.search(html_path.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit(f"{html_path}: <svg> ブロックが見つかりません")
    svg = m.group(0)
    if "viewBox" not in svg:
        raise SystemExit(f"{html_path}: viewBox がありません")
    if "xmlns=" not in svg:
        svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    # SVGは<defs>を複数持ててよい。既存の<defs>には触らずフォント用を先頭に足す。
    # ponytail: SVGはfile://からXMLとして厳密パースされるため、@import中の
    # 生の"&"がEntityRefエラーでドキュメント全体を握りつぶす(パーサエラー時は
    # <body>が空同然になり、はみ出し検査が誤って「収まっている」と判定する)。
    # CDATAで包み、CSSパーサには見せないよう/* */でCDATA境界を隠す定石を使う。
    svg = re.sub(r"(<svg[^>]*>)",
                 r"\1<defs><style>/*<![CDATA[*/" + FONT_IMPORT + "/*]]>*/</style></defs>",
                 svg, count=1)
    svg_path.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + svg,
                        encoding="utf-8")


SIZE_JS = """
() => {
  const svg = document.querySelector('svg');
  const vb = svg.viewBox.baseVal;
  svg.style.width = vb.width + 'px';
  svg.style.height = vb.height + 'px';
}
"""


def render(page, svg_path, png_path):
    """SVGを描画してPNGを書き、はみ出しの一覧を返す。"""
    page.goto(svg_path.resolve().as_uri())
    page.wait_for_load_state("networkidle")
    page.evaluate("() => document.fonts && document.fonts.ready")
    # ponytail: file://で単独開いたSVGはChromiumの既定UAスタイルでビューポート
    # (既定1280x720)いっぱいに引き伸ばされる。手書きSVGはwidth/height属性を
    # 持たないため特に顕著で、はみ出し判定・PNGサイズの両方が狂う。
    # 元となるファイルは書き換えず、描画中のDOM上でだけviewBox由来の幅高を
    # 明示する(extract_svgが生成したものにも手書きSVGにも同じ経路で効く)。
    page.evaluate(SIZE_JS)
    problems = page.evaluate(OVERFLOW_JS)
    page.locator("svg").first.screenshot(path=str(png_path), omit_background=True)
    return problems


def run(targets):
    htmls, svgs = [], []
    for t in targets:
        htmls += collect(t, ".html")
        svgs += collect(t, ".svg")

    built = 0
    for html in htmls:
        svg = html.with_suffix(".svg")
        if newer_than(svg, html):
            continue
        extract_svg(html, svg)
        built += 1
        if svg not in svgs:
            svgs.append(svg)

    rendered = skipped = 0
    failures = []
    todo = [s for s in sorted(set(svgs))
            if not newer_than(s.with_suffix(".diagram.png"), s)]
    skipped = len(set(svgs)) - len(todo)

    if todo:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(device_scale_factor=2)
            for svg in todo:
                png = svg.with_suffix(".diagram.png")
                for msg in render(page, svg, png):
                    failures.append(f"{svg.relative_to(ROOT)}: {msg}")
                rendered += 1
            browser.close()

    print(f"図解: SVG {built} 件抽出、PNG {rendered} 件描画、{skipped} 件スキップ(最新)")
    if failures:
        print("\nはみ出しを検出しました:", file=sys.stderr)
        for f in failures:
            print("  " + f, file=sys.stderr)
        raise SystemExit(1)


def self_test():
    data = SCRIPT.parent / "testdata"
    ok, ng = data / "ok.html", data / "overflow.html"
    expected_px = {}
    for h in (ok, ng):
        extract_svg(h, h.with_suffix(".svg"))
        svg_text = h.with_suffix(".svg").read_text(encoding="utf-8")
        assert h.with_suffix(".svg").exists(), f"{h}: SVGが出ていない"
        assert "fonts.googleapis.com" in svg_text, \
            f"{h}: フォント@importが入っていない"
        # PNGサイズはviewBoxのdevice_scale_factor(=2)倍になるはず。
        # SIZE_JS(render内でルートsvgをviewBox幅高に固定する処理)を外すと
        # Chromiumがビューポートいっぱいに引き伸ばしてこの値からズレる。
        vb = re.search(r'viewBox="[-\d.]+[,\s]+[-\d.]+[,\s]+([\d.]+)[,\s]+([\d.]+)"',
                        svg_text)
        expected_px[h] = (round(float(vb.group(1)) * 2), round(float(vb.group(2)) * 2))
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=2)
        ok_problems = render(page, ok.with_suffix(".svg"),
                             ok.with_suffix(".diagram.png"))
        ng_problems = render(page, ng.with_suffix(".svg"),
                             ng.with_suffix(".diagram.png"))
        browser.close()
    assert ok_problems == [], f"収まっているのに検出された: {ok_problems}"
    assert ng_problems, "はみ出しているのに検出されなかった"
    assert ok.with_suffix(".diagram.png").stat().st_size > 0, "PNGが空"
    for h in (ok, ng):
        size = Image.open(h.with_suffix(".diagram.png")).size
        assert size == expected_px[h], \
            f"{h}: PNG寸法が{expected_px[h]}のはずが{size}(ビューポートに引き伸ばされていないか確認)"
    print("self-test: OK")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--self-test" in args:
        self_test()
    else:
        paths = [Path(a).resolve() for a in args if not a.startswith("--")]
        run(paths or [ROOT / "modules"])
