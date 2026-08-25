# レッスン1-2 演習 — 色の今どきの書き方

対象トピック: 1-2-1 〜 1-2-3

## 手元で試す

レッスン1-1で使った `index.html` と `style.css` の続きから始めます。`style.css` の中身を次に置き換えて保存し、再読み込みしてください。

```css
:root {
  --color-brand: oklch(45% 0.12 250);
  --color-brand-soft: color-mix(in oklch, var(--color-brand) 20%, white);
}

h2 {
  color: var(--color-brand);
}

.notice {
  background-color: var(--color-brand-soft);
}
```

見出しが落ち着いた青、お知らせ欄の背景がその薄い版になれば成功です。書けたら、次の改造をしてみましょう。

1. `--color-brand` の色相 `250` を `150` に変えて、見出しと背景がそろって緑系に変わることを確かめる
2. 明るさ `45%` を `30%` と `60%` に変えて、色みはそのまま明暗だけ動くことを確かめる(確かめたら45%に戻す)
3. `--color-brand-soft` の `20%` を `50%` にして、背景が濃くなることを確かめる

## 演習問題

### 問1(基本)

`oklch(45% 0.12 250)` の `45%` は何を表しますか。

### 問2(基本)

`navy` を4割、`white` を6割で混ぜた色を oklch の物差しで作る式を書いてください。

### 問3(応用)

いま使っているブランド色の「少し暗い版」を oklch で作りたいです。3つの数字のうち、どれをどう動かしますか。1文で答えてください。

### 問4(応用)

色のトークン名として `--color-blue` が良くない理由を1文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

明るさです。0%が黒、100%が白で、数字がそのまま見た目の明るさに効きます。

</details>

<details>
<summary>問2の解答例</summary>

```css
color-mix(in oklch, navy 40%, white)
```

%は1つ目の色の割合で、残りを2つ目の色が受け持ちます。

</details>

<details>
<summary>問3の解答例</summary>

1つ目の明るさの%だけを下げます。色相と鮮やかさはそのままで、同じ色みの暗い版になります。

</details>

<details>
<summary>問4の解答例</summary>

見た目の名前なので、値を青以外に差し替えた瞬間に名前が嘘になるからです。役割の名前(`--color-brand` など)で付けます。

</details>

## 確認クイズ

### Q1. `oklch()` の3つの数字の並び順はどれですか。

- A. 色相・鮮やかさ・明るさ
- B. 明るさ・鮮やかさ・色相
- C. 明るさ・色相・鮮やかさ

<details>
<summary>答え</summary>

**B** — L(明るさ)、C(鮮やかさ)、H(色相)の順です。名前の並びがそのまま書き順です。

</details>

### Q2. 同じ調子のまま色みだけ変えたいとき、`oklch()` のどの数字を動かしますか。

- A. 明るさ
- B. 鮮やかさ
- C. 色相

<details>
<summary>答え</summary>

**C** — 色相が色みを決めます。oklchは色相を変えても見た目の明るさが揃うのが強みです。

</details>

### Q3. `color-mix(in oklch, navy 30%, white)` の `30%` は何の割合ですか。

- A. navy の割合
- B. white の割合
- C. 混ぜたあとの明るさ

<details>
<summary>答え</summary>

**A** — %は直前に書いた色の割合です。残りの70%をwhiteが受け持ちます。

</details>

### Q4. ブランド色の薄い版を作る組み合わせはどれですか。

- A. 黒と混ぜる
- B. 白と混ぜる
- C. 同じ色どうしを混ぜる

<details>
<summary>答え</summary>

**B** — 白と混ぜれば薄く、黒と混ぜれば濃くなります。絵の具と同じ発想です。

</details>

### Q5. 色トークンの名前の付け方として良いのはどれですか。

- A. --color-navy
- B. --color-1
- C. --color-brand

<details>
<summary>答え</summary>

**C** — 役割で名付けます。見た目の名前や連番は、値を差し替えたときに意味が通らなくなります。

</details>
