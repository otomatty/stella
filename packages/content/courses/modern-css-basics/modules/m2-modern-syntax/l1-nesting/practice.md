# レッスン2-1 演習 — 入れ子で書く

対象トピック: 2-1-1 〜 2-1-3

## 手元で試す

`index.html` の `body` に次を足します。

```html
<div class="card">
  <h3>社内勉強会</h3>
  <p>毎週金曜の夕方に開催しています。</p>
  <a href="https://example.com/">詳細を見る</a>
</div>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.card {
  border: 1px solid gray;
  padding: 16px;

  p {
    color: gray;
  }

  &:hover {
    border-color: navy;
  }
}
```

カードの中の段落だけ灰色になり、カードにマウスを乗せると枠の色が変われば成功です。書けたら、次の改造をしてみましょう。

1. 入れ子の中に `a { color: seagreen; }` を足して、カードの中のリンクだけ色が変わることを確かめる
2. `&:hover` の `&` をわざと消して、ホバーで枠が変わらなくなることを確かめる(確かめたら戻す)
3. カードの外に段落を1つ置いて、入れ子の `p` が外の段落に当たらないことを確かめる

## 演習問題

### 問1(基本)

次の従来の書き方を、入れ子で書き直してください。

```css
.menu { background-color: white; }
.menu a { color: navy; }
```

### 問2(基本)

`.button` 自身にフォーカスが当たったときの指定を、入れ子の中に書くセレクタはどれですか。

### 問3(応用)

入れ子の中の `&:hover` と `:hover`(&なし)は、当たる相手がどう違いますか。1文で答えてください。

### 問4(応用)

入れ子が4段になってしまいました。どう直すのが定石ですか。1文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
.menu {
  background-color: white;

  a {
    color: navy;
  }
}
```

中に書いた `a` が `.menu a` と同じ意味になります。

</details>

<details>
<summary>問2の解答例</summary>

```css
&:focus { }
```

自身の状態には `&` を付けます。

</details>

<details>
<summary>問3の解答例</summary>

`&:hover` は部品自身がホバーされたときに当たり、`&` なしの `:hover` は部品の中にあるホバー中の要素に当たります。

</details>

<details>
<summary>問4の解答例</summary>

対象の要素に class を付けて、部品のまとまり(2段まで)の浅い入れ子に戻します。

</details>

## 確認クイズ

### Q1. 入れ子で書いた `p` は、従来のどのセレクタと同じ意味ですか。

```css
.card {
  p { color: gray; }
}
```

- A. p
- B. .card p
- C. .card, p

<details>
<summary>答え</summary>

**B** — 入れ子は「外側のセレクタの中にある要素」を表し、子孫セレクタと同じ当たり方をします。

</details>

### Q2. 入れ子にして変わるのはどれですか。

- A. 宣言が当たる相手
- B. ルールを書く場所のまとまり
- C. 詳細度の計算方法

<details>
<summary>答え</summary>

**B** — 当たり方は従来と同じで、部品のルールが1つの波かっこに集まることが価値です。

</details>

### Q3. `&` が指すものはどれですか。

- A. ページ全体
- B. 外側のセレクタ自身
- C. 直前に書いたプロパティ

<details>
<summary>答え</summary>

**B** — `&` は外側のセレクタをその場所に写す記号です。`&:hover` で自身の状態を書けます。

</details>

### Q4. `.button` の入れ子の中で、& を付けずに `:hover` だけ書くとどうなりますか。

- A. .button 自身のホバーに当たる
- B. .button の中のホバー中の要素に当たる
- C. エラーになって何も当たらない

<details>
<summary>答え</summary>

**B** — `&` が無いと「中の要素」への指定になります。自身の状態には必ず `&` を付けます。

</details>

### Q5. 入れ子の深さの目安はどれですか。

- A. 部品のまとまりの2段まで
- B. HTMLの入れ子と同じ段数
- C. 制限は無いので何段でもよい

<details>
<summary>答え</summary>

**A** — 深い入れ子は読めず壊れやすくなります。3段目が欲しくなったら class を付けて浅く戻します。

</details>
