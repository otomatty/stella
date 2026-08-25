# レッスン3-1 演習 — CSSを書いて読み込む

対象トピック: 3-1-1 〜 3-1-4

## 手元で試す

`index.html` と同じフォルダに `style.css` を作り、次の内容を書いて保存してください。

```css
h1 {
  color: navy;
}

.note {
  color: crimson;
}
```

`index.html` の head に読み込みの1行を足します。

```html
<link rel="stylesheet" href="style.css" />
```

body の段落のうち1つに目印を付けます。

```html
<p class="note">受付は3月末までです。</p>
```

保存して再読み込みし、見出しが紺色に、目印を付けた段落だけが深紅になれば成功です。書けたら、次の改造をしてみましょう。

1. `h1` の `color` の値を別の色名に変えて、表示が変わることを確かめる
2. `.note` を `note` と書き換えて(点を消して)、効かなくなることを確かめる(確かめたら `.note` に戻す)
3. もう1つの段落にも `class="note"` を付けて、両方が深紅になることを確かめる
4. どれか1つの段落に `style="color: green;"` を書き足して、その段落だけ緑になることを確かめる(確かめたら消す)

## 演習問題

### 問1(基本)

すべての `h2` の文字色を灰色(`gray`)にするCSSを書いてください。

### 問2(基本)

次のCSSは、文字色も文字サイズも効きません。理由を説明して、直してください。

```css
p {
  color: navy
  font-size: 18px;
}
```

### 問3(応用)

「重要」という目印を付けた段落だけを深紅にしたいとします。HTMLとCSSの両方を書いてください。目印の名前は `important` にしてください。

### 問4(応用)

CSSをHTMLファイルの中に書かず、別ファイルに分ける利点を1〜2文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
h2 {
  color: gray;
}
```

セレクタが `h2`、宣言が `color: gray;` です。

</details>

<details>
<summary>問2の解答例</summary>

1つ目の宣言の終わりにセミコロンがありません。

```css
p {
  color: navy;
  font-size: 18px;
}
```

区切りがないため、`navy font-size: 18px` までがひとつづきの値として `color` に読み込まれます。この値は色として解釈できないので、宣言ごと捨てられます。結果として、文字色と文字サイズの両方が効かなくなります。

</details>

<details>
<summary>問3の解答例</summary>

```html
<p class="important">定員に達し次第、締め切ります。</p>
```

```css
.important {
  color: crimson;
}
```

HTML側は点なし、CSS側は点ありです。

</details>

<details>
<summary>問4の解答例</summary>

同じスタイルシートを何ページからでも読み込めるため、全ページの見た目を1ファイルの変更で直せます。HTMLの中に散らばっていると、同じ変更を何度も書くことになります。

</details>

## 確認クイズ

### Q1. CSSの書き方として正しい組み合わせはどれですか。

- A. セレクタと宣言の組
- B. タグと属性の組
- C. 見出しと段落の組

<details>
<summary>答え</summary>

**A** — 「どれに」を表すセレクタと、「何を」を表す宣言の組で書きます。

</details>

### Q2. color: navy; のうち、プロパティはどれですか。

- A. color
- B. navy
- C. セミコロン

<details>
<summary>答え</summary>

**A** — 何を変えるかがプロパティ、どう変えるかが値です。

</details>

### Q3. スタイルシートを読み込む link を書く場所はどれですか。

- A. head の中
- B. body の最後
- C. CSSファイルの先頭

<details>
<summary>答え</summary>

**A** — link は head に書きます。href にはスタイルシートの場所を相対パスで書きます。

</details>

### Q4. HTML側で目印を付ける書き方はどれですか。

- A. class="note"
- B. class=".note"
- C. .note="class"

<details>
<summary>答え</summary>

**A** — HTML側には点を書きません。点を付けるのはCSS側のクラスセレクタです。

</details>

### Q5. 目印の名前の付け方として、あとで困りにくいのはどれですか。

- A. red のように色で名付ける
- B. note のように役割で名付ける
- C. p1 のように順番で名付ける

<details>
<summary>答え</summary>

**B** — 役割で名付けると、色を変えても名前が嘘になりません。

</details>
