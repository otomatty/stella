# レッスン8-3 演習 — 画面を変える

対象トピック: 8-3-1 〜 8-3-5

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

この講座の総仕上げとして、**買い物リスト** を作ります。入力して追加ボタン(またはEnter)で項目が増え、項目をクリックすると消えるページです。

1. `shopping.html` を作り、次を書いて保存する

```html
<body>
  <h1>買い物リスト</h1>
  <form>
    <input>
    <button>追加</button>
  </form>
  <ul></ul>
  <script>
    const form = document.querySelector("form");
    const input = document.querySelector("input");
    const list = document.querySelector("ul");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (input.value === "") {
        return;
      }
      const item = document.createElement("li");
      item.textContent = input.value;
      list.appendChild(item);
      input.value = "";
    });

    list.addEventListener("click", (event) => {
      if (event.target === list) {
        return;  // ulの余白のクリックは無視
      }
      event.target.remove();
    });
  </script>
</body>
```

2. 「牛乳」と入力して追加ボタンを押し、リストに増えることを確かめる
3. Enterキーでも追加できることを確かめる(同じsubmitイベントが起きるため)
4. 項目をクリックすると消えることを確かめる(あとから追加した項目でも消える = 委譲の効果)

すべて、この講座で学んだ部品だけでできています。動いたら、次の改造を試してみましょう。

1. 空のまま追加ボタンを押しても何も起きないことを確かめる(早期リターンの効果)。項目の無い場所(ulの余白)をクリックしてもリストが消えないことも確かめる(もう1つの早期リターンの効果。ガードの行を消すと、余白のクリックでevent.targetがul自身になり、リストごと消えてしまいます)
2. `<style>.done { text-decoration: line-through; }</style>` をheadに足し、クリックで消す代わりに `event.target.classList.toggle("done")` に変えて、完了の印の付け外しにする
3. さらに「消すのはダブルクリック(dblclickイベント)」として、クリックは完了切り替え・ダブルクリックは削除、の2本のリスナーに分ける

## 演習問題

### 問1(基本)

`<p class="status">処理中</p>` の文字を「完了しました」に変えるコードを書いてください。

### 問2(基本)

次のコードの問題点を指摘してください(画面には何も現れません)。

```js
const item = document.createElement("li");
item.textContent = "牛乳";
```

### 問3(応用)

総仕上げの買い物リストで、リスナーを各liではなく親のulに付けているのはなぜですか。liに直接付ける方式との違いを含めて説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
const status = document.querySelector(".status");
status.textContent = "完了しました";
```

querySelectorで取り、textContentに代入します。

</details>

<details>
<summary>問2の解答例</summary>

createElementで作っただけで、appendChildで親に差し込んでいないためです。`document.querySelector("ul").appendChild(item);` のように差し込むと画面に現れます。

</details>

<details>
<summary>問3の解答例</summary>

追加ボタンで増える項目は、ページを開いた時点では存在しません。liに直接リスナーを付ける方式では、あとから増えた項目にリスナーが付かず、消せなくなります。親のulに1つ付けておけば、バブリングで全項目のクリックが届き、event.targetで押された項目を特定して消せます(イベント委譲)。

</details>

## 確認クイズ

### Q1. 要素の表示文字を変えるプロパティはどれですか。

- A. textContent
- B. value
- C. length

<details>
<summary>答え</summary>

**A** — 要素.textContent = "新しい文字" で画面の文字が変わります。valueは入力欄の中身です。

</details>

### Q2. 「完了スタイルの付け外し」をクリックのたびに繰り返すメソッドはどれですか。

- A. classList.add
- B. classList.toggle
- C. classList.remove

<details>
<summary>答え</summary>

**B** — toggleは「あれば外す・なければ付ける」です。addは付けるだけ、removeは外すだけです。

</details>

### Q3. createElementで作った要素が画面に現れるのはいつですか。

- A. createElementを呼んだ瞬間
- B. appendChildなどで親に差し込んだとき
- C. ページを再読み込みしたとき

<details>
<summary>答え</summary>

**B** — 作っただけではDOMツリーの外です。差し込んで初めて描画されます。

</details>

### Q4. 要素そのものをページから消すコードはどれですか。

- A. item.classList.remove("done")
- B. item.remove()
- C. item.textContent = ""

<details>
<summary>答え</summary>

**B** — 要素.remove()はDOMツリーから外します。Aはclassを外すだけ、Cは文字を空にするだけです。

</details>

### Q5. input.valueについて正しいものはどれですか。

- A. 常に文字列で、書き込みもできる
- B. 常に数値で、読み取り専用
- C. 真偽値が入っている

<details>
<summary>答え</summary>

**A** — 入力欄の中身は文字列です。数の計算にはNumber()を通し、追加処理の後は input.value = "" で空に戻せます。

</details>
