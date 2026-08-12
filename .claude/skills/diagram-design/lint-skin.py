# -*- coding: utf-8 -*-
"""図解HTMLがskinのトークンから外れていないか検査する。

    python .claude/skills/diagram-design/lint-skin.py [対象パス...]

references/style-guide.md のバッククォート囲みの hex を許可色・accent/ok/ngの正本として読む。
検査するのは次の6つ:
  - 許可されていない hex(3桁・6桁とも)
  - 名前付き色(fill="red" など)。rgba(...) は意図的な除外(style-guide.md参照)
  - 許可されていない font-family
  - 4の倍数でない font-size / x / y / width / height
  - accent / ok / ng の使用箇所が上限を超えている
  - viewBox が "0 <minY> 1200 <高さ>"(幅1200固定、minYと高さが4の倍数)でない
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent
ROOT = SKILL.parent.parent.parent
STYLE_GUIDE = SKILL / "references" / "style-guide.md"

# ponytail: 出現回数での近似。1つの焦点要素が fill と stroke で2回使うため上限は2。
# 「要素数」を正確に数えるにはDOMを組む必要があり、この検査には見合わない。
MAX_ACCENT_USES = 2
# ok/ng も accent と同じ理屈(1要素 = fill/stroke で最大2回出現)で上限2。
MAX_OK_USES = 2
MAX_NG_USES = 2
ALLOWED_FONTS = {"Noto Sans JP", "Figtree", "Geist Mono", "sans-serif", "monospace"}
GRID = 4
GRID_ATTRS = ("font-size", "x", "y", "width", "height", "rx")

HEX_IN_DOC = re.compile(r"`(#[0-9A-Fa-f]{6})`")
# 3桁・6桁の両方を拾う(3桁は6桁に正規化してから許可色と照合する)。
HEX_IN_SVG = re.compile(r"#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b")
# fill/stroke/stop-color に付けられた名前付き色(fill="red" など)。hex・rgba(...)・
# url(#id) は別の書き方なので拾わない。none/currentColor/transparent/inherit は
# 色トークンではないので除外する。
NAMED_COLOR = re.compile(r'(?:fill|stroke|stop-color)="([A-Za-z]+)"')
NAMED_COLOR_EXEMPT = {"none", "currentcolor", "transparent", "inherit"}
FONT_ATTR = re.compile(r"font-family=\"([^\"]*)\"")
# style-guide.md の「| `role` / `role-tint` | `#HEX` / ... |」行から role の hex を読む。
# accent/ok/ng の許可色をここに書き足すと、style-guide.md を変えてもlintが古い色の
# ままになる(このlintが実際に踏んだ不具合)。
ROLE_HEX = {
    role: re.compile(rf"`{role}`\s*/\s*`{role}-tint`\s*\|\s*`(#[0-9A-Fa-f]{{6}})`")
    for role in ("accent", "ok", "ng")
}
# <marker>もviewBoxを持つ(マーカー内部の座標系で、キャンバスの大きさとは無関係)。
# ルートの<svg ...>だけを見るよう限定する。
VIEWBOX_ATTR = re.compile(r'<svg\b[^>]*\bviewBox="([^"]*)"')
# 属性名の直前は空白でなければならない。\b だと stroke-width や markerWidth に
# 誤ヒットして、線幅1.5がグリッド違反として弾かれる。
ATTR = re.compile(r"(?:^|\s)(" + "|".join(GRID_ATTRS) + r")=\"(-?\d+(?:\.\d+)?)\"")


def allowed_hexes():
    text = STYLE_GUIDE.read_text(encoding="utf-8")
    found = {h.upper() for h in HEX_IN_DOC.findall(text)}
    if not found:
        raise SystemExit(f"{STYLE_GUIDE}: バッククォート囲みの hex が1つも読めません")
    return found


def role_hexes():
    """style-guide.md から accent/ok/ng の hex を読む(lintに直書きしない)。"""
    text = STYLE_GUIDE.read_text(encoding="utf-8")
    roles = {}
    for role, pattern in ROLE_HEX.items():
        m = pattern.search(text)
        if not m:
            raise SystemExit(f"{STYLE_GUIDE}: `{role}` の hex が読めません")
        roles[role] = m.group(1).upper()
    return roles


def collect(root):
    if root.is_file():
        return [root] if root.suffix == ".html" else []
    return sorted(p for p in root.rglob("*.html") if p.parent.name == "assets")


def check(path, allowed, roles):
    text = path.read_text(encoding="utf-8")
    problems = []

    for h in sorted(set(HEX_IN_SVG.findall(text))):
        digits = h[1:]
        # 3桁hex(#f0f)は6桁に正規化してから許可色と照合する。
        normalized = "#" + "".join(c * 2 for c in digits) if len(digits) == 3 else h
        if normalized.upper() not in allowed:
            problems.append(f"トークンにない色 {h}")

    for name in sorted(set(NAMED_COLOR.findall(text))):
        if name.lower() not in NAMED_COLOR_EXEMPT:
            problems.append(f"名前付き色 {name}(トークンのhexを使う)")

    viewboxes = VIEWBOX_ATTR.findall(text)
    if not viewboxes:
        problems.append("viewBox がありません")
    for vb in viewboxes:
        m = re.fullmatch(r"0 (\d+) 1200 (\d+)", vb.strip())
        if not m:
            problems.append(f'viewBox の形式が不正 "{vb}"(0 <minY> 1200 <高さ> の形式にする)')
        else:
            min_y, height = int(m.group(1)), int(m.group(2))
            if min_y % GRID:
                problems.append(f"viewBox の minY {min_y} が{GRID}の倍数でない")
            if height % GRID:
                problems.append(f"viewBox の高さ {height} が{GRID}の倍数でない")

    for decl in FONT_ATTR.findall(text):
        for fam in decl.split(","):
            fam = fam.strip().strip("'\"")
            if fam and fam not in ALLOWED_FONTS:
                problems.append(f"許可されていない書体 {fam}")

    for name, value in ATTR.findall(text):
        n = float(value)
        if n != int(n) or int(n) % GRID:
            problems.append(f"{GRID}px グリッド違反 {name}=\"{value}\"")

    for name, color, limit in (
        ("accent", roles["accent"], MAX_ACCENT_USES),
        ("ok", roles["ok"], MAX_OK_USES),
        ("ng", roles["ng"], MAX_NG_USES),
    ):
        used = len(re.findall(color, text, re.I))
        if used > limit:
            problems.append(f"{name} の使用が {used} 箇所(上限 {limit})")

    return problems


def main(targets):
    allowed = allowed_hexes()
    roles = role_hexes()
    files = [f for t in targets for f in collect(t)]
    failures = []
    for f in files:
        for msg in check(f, allowed, roles):
            failures.append(f"{f.relative_to(ROOT)}: {msg}")

    print(f"図解lint: {len(files)} 件検査、{len(failures)} 件の違反")
    if failures:
        for f in failures:
            print("  " + f, file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    paths = [Path(a).resolve() for a in sys.argv[1:] if not a.startswith("--")]
    main(paths or [ROOT / "packages" / "content" / "modules"])
