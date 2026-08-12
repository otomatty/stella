# Comparison

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**用途:** A と B のどちらか一方だけが持つ性質を1つ見せる。教材の主力型。

## Layout conventions
- **2列固定。** 3つ以上を並べたくなったら図をやめて表にする。
- 列の骨格: 行ラベル列(x=80 w=272、右寄せ)/ A列(x=384 w=352)/ B列(x=768 w=352)。
- **行は2つまで。** ノード上限6(見出し2 + セル4)に収まる。
- 左右の対応する行は同じ y に置く。
- **差が出る行だけ**を `ok` / `ng` で1つずつ着色し、他は `ink` / `muted`。
- 見出しがコード識別子(`const` / `let` など)なら Geist Mono 24 / 500、日本語なら Noto Sans JP 24 / 600。
- コードそのものを図にしない。1行の断片までに留める。

## Anti-patterns
- 3列以上を並べる。
- 行ごとに色を変える(差が出る行以外にも `ok` / `ng` を使う)。
- 左右で行数が違う。
- 「どちらが良いか」を図で断じる(判断は本文の役割)。

## 例: let-vs-const

`const` と `let` の「あとから代入し直せるか」を2行2列で対比する。宣言行は差がないので `ink` / `muted`、代入し直す行だけが差を持つので `ok` / `ng` で着色する。

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>constとletの違い</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Figtree:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>body { margin: 0; padding: 24px; background: #FFFFFF; }</style>
</head>
<body>
<svg viewBox="0 144 1200 496" width="1200" xmlns="http://www.w3.org/2000/svg">

  <rect x="384" y="176" width="352" height="88" rx="12"
        fill="#F7F7F9" stroke="#B7B7BE" stroke-width="2"/>
  <text x="560" y="232" text-anchor="middle" font-size="24" font-weight="500"
        font-family="'Geist Mono', monospace" fill="#0E0E10">const</text>

  <rect x="768" y="176" width="352" height="88" rx="12"
        fill="#F7F7F9" stroke="#B7B7BE" stroke-width="2"/>
  <text x="944" y="232" text-anchor="middle" font-size="24" font-weight="500"
        font-family="'Geist Mono', monospace" fill="#0E0E10">let</text>

  <text x="352" y="344" text-anchor="end" font-size="24" font-weight="600"
        font-family="'Noto Sans JP', sans-serif" fill="#5C5C66">宣言する</text>
  <rect x="384" y="296" width="352" height="88" rx="12"
        fill="#FFFFFF" stroke="#DDDDE2" stroke-width="1.5"/>
  <text x="560" y="352" text-anchor="middle" font-size="24"
        font-family="'Geist Mono', monospace" fill="#0E0E10">const n = 1;</text>
  <rect x="768" y="296" width="352" height="88" rx="12"
        fill="#FFFFFF" stroke="#DDDDE2" stroke-width="1.5"/>
  <text x="944" y="352" text-anchor="middle" font-size="24"
        font-family="'Geist Mono', monospace" fill="#0E0E10">let n = 1;</text>

  <text x="352" y="472" text-anchor="end" font-size="24" font-weight="600"
        font-family="'Noto Sans JP', sans-serif" fill="#5C5C66">代入し直す</text>
  <rect x="384" y="416" width="352" height="104" rx="12"
        fill="rgba(229,52,43,0.08)" stroke="#E5342B" stroke-width="2"/>
  <text x="560" y="456" text-anchor="middle" font-size="24"
        font-family="'Geist Mono', monospace" fill="#0E0E10">n = 2;</text>
  <text x="560" y="492" text-anchor="middle" font-size="20" font-weight="500"
        font-family="'Noto Sans JP', sans-serif" fill="#E5342B">エラーになる</text>

  <rect x="768" y="416" width="352" height="104" rx="12"
        fill="rgba(22,163,74,0.08)" stroke="#16A34A" stroke-width="2"/>
  <text x="944" y="456" text-anchor="middle" font-size="24"
        font-family="'Geist Mono', monospace" fill="#0E0E10">n = 2;</text>
  <text x="944" y="492" text-anchor="middle" font-size="20" font-weight="500"
        font-family="'Noto Sans JP', sans-serif" fill="#16A34A">2 に変わる</text>
</svg>
</body>
</html>
```
