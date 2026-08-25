# レッスン2-3 演習 — セレクタを広げる

対象トピック: 2-3-1 〜 2-3-4

## 手元で試す

`index.html` の `body` に次を足します。

```html
<ul class="menu">
  <li>ホーム</li>
  <li>研修一覧
    <ul>
      <li>HTML/CSS</li>
      <li>TypeScript</li>
    </ul>
  </li>
</ul>
<h2>お知らせ</h2>
<p>新しい講座が追加されました。</p>
<p>受講はマイページから申し込めます。</p>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.menu > li {
  border-bottom: 1px solid gray;
}

h2 + p {
  font-weight: bold;
}
```

メニューの1段目だけに下線が付き、見出しの直後の段落だけ太字になれば成功です。書けたら、次の改造をしてみましょう。

1. `.menu > li` の `>` を空白に変えて、サブメニューにも線が付いてしまうことを確かめる(確かめたら戻す)
2. チェックボックス `<input type="checkbox" />` とテキスト欄 `<input type="text" />` を置き、`input[type="checkbox"] { accent-color: crimson; }` がチェックボックスだけに効くことを確かめる
3. レッスン2-1のカードを2枚に増やし、片方だけに `img` を入れて、`.card:has(img) { border-color: crimson; }` が画像入りのカードだけに当たることを確かめる

## 演習問題

### 問1(基本)

`.list` の直下の `li` だけに当てるセレクタを書いてください。

### 問2(基本)

`h3` の直後に続く `ul` だけに当てるセレクタを書いてください。

### 問3(基本)

`type` が `date` の `input` だけに当てるセレクタを書いてください。

### 問4(応用)

「リンクを1つも持たない `.card`」ではなく「リンクを持つ `.card`」に当てるセレクタを書いてください。

### 問5(応用)

`.menu li` と `.menu > li` の違いを1文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
.list > li { }
```

`>` で直下の1段だけに絞ります。

</details>

<details>
<summary>問2の解答例</summary>

```css
h3 + ul { }
```

`+` は同じ親の中で直後に続く要素に当たります。

</details>

<details>
<summary>問3の解答例</summary>

```css
input[type="date"] { }
```

角かっこに属性と値を書いて、完全一致で絞ります。

</details>

<details>
<summary>問4の解答例</summary>

```css
.card:has(a) { }
```

`:has()` のかっこに条件を書くと、それを持つ外側の要素に当たります。

</details>

<details>
<summary>問5の解答例</summary>

空白は中の `li` すべて(何段でも)に当たり、`>` は直下の `li` だけに当たります。

</details>

## 確認クイズ

### Q1. セレクタどうしをつなぐ空白や `>` などの記号を何と呼びますか。

- A. 結合子
- B. 演算子
- C. 修飾子

<details>
<summary>答え</summary>

**A** — セレクタをつなぐ記号が結合子です。空白(子孫)も `>`(子)もその仲間です。

</details>

### Q2. `.menu > li` が当たるのはどれですか。

- A. .menu の中の li 全部
- B. .menu の直下の li だけ
- C. .menu の直後に並ぶ li

<details>
<summary>答え</summary>

**B** — `>` は子結合子で、1段だけに絞ります。

</details>

### Q3. `h2 + p` が当たるのはどれですか。

- A. h2 の中の段落
- B. h2 より後ろにある段落すべて
- C. h2 の直後に続く段落だけ

<details>
<summary>答え</summary>

**C** — `+` は隣接兄弟結合子で、同じ親の中の「すぐ隣」だけに当たります。

</details>

### Q4. `input[type="checkbox"]` の角かっこの部分は何で相手を選んでいますか。

- A. 要素に付いている属性とその値
- B. 要素の class
- C. 要素の並び順

<details>
<summary>答え</summary>

**A** — 属性セレクタは、HTMLに書いてある属性の情報をそのまま条件にします。

</details>

### Q5. `.card:has(img)` で見た目が変わるのはどれですか。

- A. カードの中の img
- B. 条件を満たす .card 自身
- C. ページ内の img すべて

<details>
<summary>答え</summary>

**B** — `:has()` の条件はかっこの中の要素ですが、当たるのは囲んでいる側の要素です。

</details>
