# レッスン3-3 演習 — フォーカスの見た目

対象トピック: 3-3-1 〜 3-3-2

## 手元で試す

`index.html` にボタンと入力欄を並べます。

```html
<label for="name">名前</label>
<input id="name" type="text" />
<button>送信</button>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
:root {
  --color-brand: oklch(45% 0.12 250);
}

button {
  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 3px solid var(--color-brand);
    outline-offset: 2px;
  }
}
```

マウスでボタンをクリックしても枠が出ず、Tab キーで移動したときだけブランド色の枠が出れば成功です。書けたら、次の改造をしてみましょう。

1. マウスクリックと Tab 移動を交互に行い、枠の出る場面が操作によって違うことを確かめる
2. `&:focus-visible` のブロックをわざと消して、Tab 移動でも枠が出なくなる(現在地を見失う)ことを確かめる(確かめたら戻す)
3. `outline-offset: 2px` を `0` と `6px` に変えて、枠と要素の距離の見え方を比べる

## 演習問題

### 問1(基本)

`:focus` と `:focus-visible` は、当たる場面がどう違いますか。1文で答えてください。

### 問2(基本)

`input` に、キーボード操作のときだけ3pxの実線の枠を出すルールを書いてください。

### 問3(応用)

「フォーカスの枠がデザインに合わないので消してほしい」と頼まれました。どう対応するのが正しいですか。1文で答えてください。

### 問4(応用)

フォーカスの枠を `border` ではなく `outline` で描く理由を1文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`:focus` はフォーカスされたら常に当たり、`:focus-visible` は枠の表示が必要な操作(Tab移動など)のときだけ当たります。

</details>

<details>
<summary>問2の解答例</summary>

```css
input:focus-visible {
  outline: 3px solid navy;
}
```

見た目の指定は `:focus-visible` に寄せます。

</details>

<details>
<summary>問3の解答例</summary>

`outline: none` で消すだけにせず、`:focus-visible` で代わりの枠を用意して置き換えます。

</details>

<details>
<summary>問4の解答例</summary>

`outline` はレイアウトに影響せず、枠が出ても要素や周りが動かないからです。

</details>

## 確認クイズ

### Q1. フォーカスとはどんな状態ですか。

- A. マウスが上に乗っている状態
- B. いま操作対象になっている状態
- C. ページの読み込みが終わった状態

<details>
<summary>答え</summary>

**B** — Tab移動やクリックで操作対象になった状態です。`:hover`(乗っているだけ)とは別物です。

</details>

### Q2. マウスでボタンをクリックした直後、当たらないのはどちらですか。

- A. :focus
- B. :focus-visible

<details>
<summary>答え</summary>

**B** — クリックでは枠の必要性が薄いため、`:focus-visible` は当たりません。`:focus` は常に当たります。

</details>

### Q3. `outline: none` を書くときに必ずセットにするものはどれですか。

- A. :focus-visible で代わりの枠を用意する
- B. :hover の色を濃くする
- C. border を透明にする

<details>
<summary>答え</summary>

**A** — 消すなら置き換える、が原則です。消すだけではキーボード利用者が現在地を失います。

</details>

### Q4. `outline` が `border` と違う点はどれですか。

- A. 色が指定できない
- B. レイアウトに影響しない
- C. フォーカス時にしか使えない

<details>
<summary>答え</summary>

**B** — outline は場所を取らないので、枠が出ても要素や周りが動きません。

</details>

### Q5. 枠を要素から少し離して描くプロパティはどれですか。

- A. outline-offset
- B. outline-gap
- C. margin-outline

<details>
<summary>答え</summary>

**A** — `outline-offset` で枠と要素の距離を調整でき、視認性が上がります。

</details>
