# レッスン4-2 演習 — ダイアログを開く

対象トピック: 4-2-1 〜 4-2-4

## 手元で試す

`index.html` に、確認ダイアログを置きます。

```html
<button command="show-modal" commandfor="confirm">
  受講を取り消す
</button>

<dialog id="confirm" aria-labelledby="confirm-title">
  <h2 id="confirm-title">受講の取り消し</h2>
  <p>この講座の受講を取り消しますか?</p>

  <form method="post" action="/enrollments/1/cancel">
    <button type="button" command="close" commandfor="confirm">やめる</button>
    <button type="submit">取り消す</button>
  </form>
</dialog>
```

ブラウザーで開いて、次を確かめてください。CSS はまだ当てません。

1. 最初は何も表示されず、ボタンを押すと前面に出る
2. 開いている間、背面のリンクやボタンを押せない
3. Esc キーを押すと閉じる
4. 「やめる」を押しても閉じる(送信されない)
5. 「やめる」から `type` / `command` / `commandfor` を **3 つとも** 外すと、ただのボタンが送信ボタン扱いになり、押した瞬間に送信される(確かめたら戻す。`action` の宛先が無いのでエラー表示になります)。`command` が残っている間はコマンドのボタンなので送信されません

開かないときは、対応していないブラウザーの可能性があります。その場合は書いた内容の確認までに留めてください(代わりに動く JavaScript は書きません)。

## 演習問題

### 問1(基本)

`<dialog>` を書いたのに画面に何も出ません。原因は何ですか。

### 問2(基本)

ダイアログをモーダルで開くボタンを書いてください。相手の `id` は `confirm` とします。

### 問3(応用)

モーダルで開くと自動的に付いてくるふるまいを、3 つ挙げてください。

### 問4(応用)

補足の情報を、背面を見ながら参照させたい場面があります。ダイアログとポップオーバーのどちらが合いますか。理由も添えて答えてください。

### 問5(応用)

ダイアログの中に `<h2>受講の取り消し</h2>` を置きました。これだけでは足りないのはなぜですか。足すべき属性も答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`dialog` は閉じているのが既定の状態だからです。開く操作をするまで表示されません。

</details>

<details>
<summary>問2の解答例</summary>

```html
<button command="show-modal" commandfor="confirm">開く</button>
```

</details>

<details>
<summary>問3の解答例</summary>

背面が操作できなくなること、フォーカスがダイアログの中に留まること、Esc キーで閉じられることです(背面に暗い面を敷けることも含みます)。

</details>

<details>
<summary>問4の解答例</summary>

ポップオーバーです。モーダルのダイアログは背面の操作を止めてしまうので、見ながら参照する用途には向きません。

</details>

<details>
<summary>問5の解答例</summary>

中に見出しを置いても、それがダイアログの名前にはならないからです。見出しに `id` を付け、`dialog` に `aria-labelledby="その id"` を書きます。

</details>

## 確認クイズ

### Q1. `dialog` 要素の既定の状態はどれですか。

- A. 開いている
- B. 閉じていて表示されない
- C. 画面の下に小さく表示される

<details>
<summary>答え</summary>

**B** — 開く操作をするまで表示されません。「書いたのに出ない」の原因はこれです。

</details>

### Q2. ダイアログをモーダルで開く `command` の値はどれですか。

- A. `open`
- B. `show-modal`
- C. `toggle-popover`

<details>
<summary>答え</summary>

**B** — 相手は `commandfor` に `id` で書きます。

</details>

### Q3. ダイアログの中に置く「閉じる」ボタンの書き方はどれですか。

- A. `command="close"` と `commandfor` を書く
- B. `type="reset"` を書く
- C. `popovertarget` を書く

<details>
<summary>答え</summary>

**A** — 開くときと同じ 2 属性で、値が `close` になります。`form` の中に置くときは `type="button"` も書きます(この仕組みに対応していないブラウザーで送信ボタン扱いになるのを防ぐため)。

</details>

### Q4. ダイアログに名前を付ける書き方はどれですか。

- A. 中に `h2` を置けば自動的に名前になる
- B. 見出しの `id` を `aria-labelledby` で指す
- C. `title` 属性を書く

<details>
<summary>答え</summary>

**B** — 中の見出しは自動では名前になりません。名前が無いと「ダイアログ」としか読み上げられません。

</details>

### Q5. モーダルで開いたときに付いてこないものはどれですか。

- A. 背面の操作が止まる
- B. フォーカスがダイアログの中に留まる
- C. 入力内容が自動で保存される

<details>
<summary>答え</summary>

**C** — 保存の仕組みは付いてきません。付いてくるのは背面の停止・フォーカスの保持・Esc での閉じるなどです。

</details>
