# レッスン1-2 演習 — メディアオブジェクト

対象トピック: 1-2-1 〜 1-2-4

## 手元で試す

`index.html` と同じフォルダーに画像を 1 枚置き、`avatar.png` という名前にします(手元にある任意の画像で構いません)。そのうえで、メディアオブジェクトを **2 件** 置きます。

```html
<div class="media">
  <img src="./avatar.png" alt="">
  <div class="media-body">
    <p><strong>佐藤</strong></p>
    <p>15時から会議室Aです。</p>
    <a href="#reply-1">返信する</a>
  </div>
</div>

<div class="media">
  <img src="./avatar.png" alt="">
  <div class="media-body">
    <p><strong>田中</strong></p>
    <p>資料を共有フォルダーに置きました。確認をお願いします。</p>
    <a href="#reply-2">返信する</a>
  </div>
</div>
```

`style.css` に次を足します。

```css
:root {
  --avatar-size: 48px;
  --space-2: 12px;
  --accent: oklch(55% 0.16 264);
}

.media {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;

  img {
    inline-size: var(--avatar-size);
    block-size: var(--avatar-size);
    object-fit: cover;
  }

  .media-body {
    flex: 1;
  }

  .media-body a {
    &:hover { color: var(--accent); }
    &:focus-visible { outline: 2px solid var(--accent); }
  }
}
```

画像と本文が横に並び、2 件とも同じ形で表示されれば成功です。書けたら、次の改造をしてみましょう。

1. `--avatar-size` を `32px` に変えて、2 件とも同時に小さくなることを確かめる
2. `img` の `block-size` と `.media` の `align-items` の **2 行を同時に消して**、画像の枠が本文の高さいっぱいに伸びることを確かめる(これが既定の `stretch` の挙動です。`object-fit: cover` が残っているので、中の絵は歪まずに切り取られます。さらに `object-fit` も消すと、絵そのものが縦に引き伸びます。確かめたら戻す)
3. `.media-body` に `background-color: gainsboro;` を足し、`flex: 1` を消して、本文の箱が中身の幅までしか広がらなくなることを確かめる(確かめたら戻す)

## 演習問題

### 問1(基本)

メディアオブジェクトの中身は、いくつの枠で構成しますか。理由も 1 文で答えてください。

### 問2(基本)

`align-items` を書かないと既定値は何になり、高さを指定していない画像はどうなりますか。`object-fit: cover` の有無で分けて答えてください。

### 問3(応用)

本文の枠にだけ `flex: 1` を付けると、何が変わりますか。1 文で答えてください。

### 問4(応用)

コメントに投稿者名が文字で表示されていない場合、隣の顔写真の `alt` はどう書きますか。理由も添えて答えてください。

### 問5(応用)

上の実習のコメント行を「どこを押しても開く」ようにしたいとき、何を変えますか。中の「返信する」リンクはどうなりますか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

画像と本文の 2 つです。2 つに絞ることで、どこに置いても同じ形で使い回せるからです。

</details>

<details>
<summary>問2の解答例</summary>

既定値は `stretch` で、交差軸(縦)のサイズが行の高さまで引き伸ばされるため、画像の枠が縦に伸びます。上の CSS のように `object-fit: cover` を当てていれば中の絵は歪まずに切り取られ、`object-fit` が無ければ絵そのものが縦に歪みます。

</details>

<details>
<summary>問3の解答例</summary>

本文の箱が主軸(横)の余った幅を受け取って広がり、中身の幅までで止まらなくなります。

</details>

<details>
<summary>問4の解答例</summary>

`alt="佐藤"` のように投稿者名を書きます。名前が画像にしかないなら、その画像が投稿者を知る唯一の手がかりだからです。

</details>

<details>
<summary>問5の解答例</summary>

囲みの `div` を `a` に変えます。押せる範囲は CSS ではなくマークアップで決まるためです。

ただし、そのままでは中の「返信する」が **リンクの中のリンク** になってしまいます。これは不正な HTML で、ブラウザーが勝手に組み替えるため思ったとおりに動きません。行全体をリンクにするなら、中のリンクは外に出すか、`button` などリンク以外の操作に変えます。

</details>

## 確認クイズ

### Q1. メディアオブジェクトの説明として正しいものはどれですか。

- A. 画像と本文が横に並ぶ、2 つの中身だけの部品
- B. 画像を何枚でも並べられるギャラリー部品
- C. 動画を再生するための専用要素

<details>
<summary>答え</summary>

**A** — 枠を 2 つに絞ることで、どこでも同じ形で使い回せます。投稿者名も本文の枠に入れます。

</details>

### Q2. `align-items` の既定値 `stretch` は何をしますか。

- A. 子を交差軸の中央に置く
- B. 子の交差軸のサイズを行の高さまで引き伸ばす
- C. 子を主軸の端に寄せる

<details>
<summary>答え</summary>

**B** — 高さを指定していない画像は枠が縦に伸びます(`object-fit: cover` があれば中の絵は切り取られ、無ければ歪みます)。`flex-start` を明示すると上端に置かれます。

</details>

### Q3. `.media-body { flex: 1; }` は何をしていますか。

- A. 本文の文字を大きくする
- B. 本文の箱が主軸の余った幅を受け取って広がる
- C. 本文を折り返さないようにする

<details>
<summary>答え</summary>

**B** — 書かないと、箱は中身の幅までしか広がりません。

</details>

### Q4. 顔写真の `alt` を空にしてよいのはどんなときですか。

- A. 同じ情報(投稿者名)が隣の文字で読めるとき
- B. 顔写真ならいつでも空でよい
- C. 画像の容量が小さいとき

<details>
<summary>答え</summary>

**A** — 名前が画像にしかないなら、`alt` にその名前を書きます。判断は文脈で決まります。

</details>

### Q5. 部品の全体を押せるようにする方法はどれですか。

- A. 囲みの要素を `a` にする(中に別のリンクは置けない)
- B. 囲みに `:hover` を書いて色を変える
- C. 囲みに `cursor: pointer` を書く

<details>
<summary>答え</summary>

**A** — 押せる範囲はマークアップで決まります。見た目だけを変えても押せるようにはなりません。なお、リンクの中にリンクは置けないので、中の操作は外に出すか `button` にします。

</details>
