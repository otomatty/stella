# レッスン7-1 演習 — イベントを聞く

対象トピック: 7-1-1 〜 7-1-5

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

今回から、ページが操作に反応するようになります。

1. `counter.html` を作り、次を書いて保存する

```html
<body>
  <button>押してカウント</button>
  <script>
    const button = document.querySelector("button");
    let count = 0;
    button.addEventListener("click", () => {
      count += 1;
      console.log(`${count}回押されました`);
    });
  </script>
</body>
```

2. ブラウザーで開いてボタンを何度か押し、コンソールの数字が増えることを確かめる

書けたら、次の改造を試してみましょう。

1. `<input>` をボタンの上に足し、keydownのリスナーで `event.key` を表示する。いろいろなキーを押して名前を見る
2. `if (event.key === "Enter")` でEnterのときだけ `送信します` と表示する
3. `<script>` を `<head>` の中へ移動して保存し、動かなくなること(要素がまだ無い)を確かめる。確かめたら戻す

## 演習問題

### 問1(基本)

次のコードには2か所誤りがあります。指摘して直してください。

```js
const button = document.querySelector("button");
button.addEventListener(click, greet());
```

### 問2(基本)

イベント名とその出来事の組み合わせとして、click / keydown / input それぞれが「いつ起きるか」を一言で書いてください。

### 問3(応用)

`<button onclick="save()">保存</button>` をaddEventListener方式に書き換えてください(save関数は定義済みとします)。また、この書き換えの利点を1つ挙げてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
button.addEventListener("click", greet);
```

- イベント名は文字列なので `"click"` と引用符で囲む
- 渡すのは関数そのものなので `greet` に `()` を付けない

</details>

<details>
<summary>問2の解答例</summary>

- click — 要素がクリックされたとき
- keydown — キーが押されたとき
- input — 入力欄の中身が変わったとき

</details>

<details>
<summary>問3の解答例</summary>

```html
<button>保存</button>
<script>
  const button = document.querySelector("button");
  button.addEventListener("click", save);
</script>
```

利点の例: HTMLとJavaScriptの分担が保たれ、動きの修正がJavaScript側だけで済む。同じ要素に複数のリスナーを登録できる。インライン実行を禁止する安全設定の現場でも動く。

</details>

## 確認クイズ

### Q1. イベントの説明として正しいものはどれですか。

- A. ブラウザーが検知する画面の出来事
- B. JavaScriptの変数の一種
- C. HTMLのタグの名前

<details>
<summary>答え</summary>

**A** — クリックやキー入力などの出来事に、click / keydownといった名前が付いています。

</details>

### Q2. ページの要素をJavaScriptから1つ取る書き方はどれですか。

- A. document.querySelector("button")
- B. document.getElement("button")
- C. button.addEventListener()

<details>
<summary>答え</summary>

**A** — documentがページの窓口で、querySelectorがセレクターに合う要素を1つ返します。

</details>

### Q3. addEventListenerの2つ目の引数に渡すものはどれですか。

- A. イベントの名前
- B. イベントが起きたときに動く関数そのもの
- C. 関数を実行した結果

<details>
<summary>答え</summary>

**B** — 関数に()を付けずに渡します。()を付けるとその場で実行した結果を渡してしまいます。

</details>

### Q4. 押されたキーの名前はどこから読めますか。

- A. リスナーの引数で渡されるイベントオブジェクトのkey
- B. document.key
- C. addEventListenerの戻り値

<details>
<summary>答え</summary>

**A** — リスナーは引数でイベントオブジェクトを受け取り、event.keyにキー名が入っています。

</details>

### Q5. この講座でonclick属性を使わない理由に当てはまらないものはどれですか。

- A. HTMLとJavaScriptの分担が崩れるから
- B. 同じ要素に複数の処理を登録できないから
- C. addEventListenerより実行速度が遅いから

<details>
<summary>答え</summary>

**C** — 速度は理由ではありません。分担・多重登録・安全設定の3点が理由です。

</details>
