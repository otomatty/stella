# レッスン3-1 演習 — フッタとオーバーレイ

対象トピック: 3-1-1 〜 3-1-4

## 手元で試す

レッスン2-2 の続きです。まず、フッタを下端に付けます。`style.css` の `body` を次の形にします。

```css
body {
  margin: 0;
  background-color: var(--surface);
  color: var(--ink);
  min-height: 100svh;
  display: grid;
  grid-template-rows: auto 1fr auto;
}
```

`footer` にも帯の見た目を付けておきます。

```css
footer {
  background-color: var(--surface-2);
  border-block-start: 1px solid var(--line);
}
```

`footer` の中身も `header` と同じく wrapper で囲みます。

```html
<footer>
  <div class="wrapper">
    <p><small>© 2026 社内勉強会運営チーム</small></p>
  </div>
</footer>
```

次に、ヘッダの wrapper に「使い方」のポップオーバーを、申し込みの区画にキャンセルの決まりのダイアログを足します(HTML は doc.md のとおりです)。ポップオーバーとダイアログの見た目の CSS は、部品講座で書いたものがあればそのまま貼り付けてください。

確かめること:

1. `main` の区画を一時的に 1 つ残して消し、本文が短くてもフッタが画面の下端に付くことを確かめる(確かめたら戻す)
2. `grid-template-rows` の `1fr` を一時的に `auto` にして、フッタがまた浮くことを確かめる(確かめたら戻す)
3. 「使い方」ボタンでポップオーバーが開き、外側を押すと閉じることを確かめる
4. 「キャンセルの決まりを見る」でダイアログがモーダルに開き、開いている間は背面のリンクが押せないこと、Esc キーで閉じられることを確かめる

## 演習問題

### 問1(基本)

`body { min-height: 100svh; }` だけではフッタが下端に付かないのはなぜですか。1 文で答えてください。

### 問2(基本)

`grid-template-rows: auto 1fr auto` の 3 つの値は、それぞれどの landmark のどんな高さを表していますか。

### 問3(応用)

`min-height` を `height` にすると、本文の長いページで何が起きますか。1 文で答えてください。

### 問4(応用)

「使い方のヒント」と「キャンセルの決まりの確認」に、ポップオーバーとモーダルのダイアログをどう割り当てましたか。判断の基準とあわせて答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

伸びるのは `body` だけで、中の `header` / `main` / `footer` は中身のぶんの高さのままなので、余った高さを誰に配るかを決めるまでフッタは動きません。

</details>

<details>
<summary>問2の解答例</summary>

上から `header` の行(中身のぶん)、`main` の行(余りを全部受け取る `1fr`)、`footer` の行(中身のぶん)です。

</details>

<details>
<summary>問3の解答例</summary>

`body` の高さが画面 1 枚ぶんに固定され、本文の長いページで中身が `body` からあふれてしまいます。短いページを底上げしつつ長いページを妨げないために `min-height` を使います。

</details>

<details>
<summary>問4の解答例</summary>

ちら見のヒントは背面が生きたままのポップオーバー、読んでから進んでほしい決まりは背面を止めるモーダルのダイアログに割り当てました。基準は「背面を触られて困るか」です。

</details>

## 確認クイズ

### Q1. フッタが画面の途中に浮く直接の原因はどれですか。

- A. `footer` に `position` を指定していないから
- B. `body` の高さが既定では中身のぶんしかないから
- C. `footer` を `body` の外に書いたから

<details>
<summary>答え</summary>

**B** — 本文が短いと `body` ごと短くなり、その最後にあるフッタは途中で終わります。まず `min-height: 100svh` で画面の高さまで伸ばします。

</details>

### Q2. 余った高さを `main` に渡す指定はどれですか。

- A. `grid-template-rows: auto 1fr auto`
- B. `grid-template-rows: 1fr auto 1fr`
- C. `main { height: 100% }`

<details>
<summary>答え</summary>

**A** — 2 行目の `1fr` が `main` の行です。`fr` は余りを配る単位で、`auto` の行は中身のぶんのままです。

</details>

### Q3. `100vh` ではなく `100svh` を使う理由はどれですか。

- A. `svh` の方が新しい単位だから
- B. スマートフォンのアドレスバーが出ていても画面に収まる高さだから
- C. `vh` は横幅の単位だから

<details>
<summary>答え</summary>

**B** — `100vh` はアドレスバーのぶんはみ出すことがあります。`svh` は小さい方の画面基準なので確実に収まります。アドレスバーが引っ込んだ間は下に少し空きが残りますが、高さが動き続ける `dvh` より安定します。

</details>

### Q4. 重ねて出す部品(ポップオーバー・ダイアログ)の載せ方として、この講座の方針はどれですか。

- A. 便利なので区画ごとに置く
- B. 1 枚のページに 1 つずつに留める
- C. 使わない

<details>
<summary>答え</summary>

**B** — 最前面は 1 枚しかなく、面が増えるほど操作の現在地を見失わせます。2 つ目が欲しくなったら、本文の区画で置けないかを先に考えます。

</details>

### Q5. モーダルのダイアログを選ぶ判断基準はどれですか。

- A. 中身の文章が長いかどうか
- B. 開いている間、背面を触られて困るかどうか
- C. 画像を含むかどうか

<details>
<summary>答え</summary>

**B** — 読んでから進んでほしい内容は背面を止めるモーダル、ちら見のヒントは背面が生きたままのポップオーバーです。

</details>
