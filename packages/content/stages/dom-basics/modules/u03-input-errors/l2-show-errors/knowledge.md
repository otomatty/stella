---
sourceRefs: [SRC-mdn-js-trim-20261119, SRC-mdn-js-equality-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-return-20261119, SRC-mdn-aria-invalid-20261119, SRC-mdn-aria-describedby-20261119, SRC-mdn-dom-input-event-20261119]
---

## 知識問題

### Q1. 空欄を認めない `validateName` に空白だけの文字列を渡すと、何が返りますか？
<!-- kind: single; skills: dom-validation-function -->

- A. 空文字 `""`
- B. 渡した文字列がそのまま返る
- C. `"名前を入力してください。"`

<details>
<summary>解答</summary>

**C** — `trim()` で空白を取り除くと空文字になります。名前が必要なので、入力を促す文を返します。

</details>

### Q2. 文字列を受け取って文を返す検証関数なら、画面を用意せずにテストできます。
<!-- kind: boolean; skills: dom-validation-function -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 関数は画面の要素に触れません。文字列を渡し、返ってきた文と期待する文を比べます。

</details>

### Q3. 名前の入力が無効です。`<p id="name-error">` に直し方を表示したとき、入力欄に設定する属性をすべて選んでください。
<!-- kind: multiple; skills: dom-error-display, dom-form-choice -->

- A. `aria-describedby="name-error"`
- B. `aria-describedby="#name-error"`
- C. `aria-invalid="true"`
- D. `aria-invalid="name-error"`

<details>
<summary>解答</summary>

**A, C** — `aria-describedby` には `#` を付けずに説明の `id` を書きます。`aria-invalid="true"` は入力が無効であることを示します。

</details>

### Q4. 空欄で送信してエラーが出たあと、利用者は空白だけを入力しました。`input` の処理ではエラーをどう扱いますか？
<!-- kind: single; skills: dom-error-clear -->

- A. エラー文と `aria-invalid` を両方とも消す
- B. 再検証の結果が無効なので、エラー文と `aria-invalid` を残す
- C. エラー文だけ消して、`aria-invalid` を残す

<details>
<summary>解答</summary>

**B** — 空白だけなら検証結果は変わりません。有効な名前になった時点で、エラー文と無効の印を両方消します。

</details>

### Q5. 有効な名前に直しても、読み上げソフトが欄を無効と扱います。コードはエラー文の `textContent` だけを空にしています。どの状態にすれば直りますか？ 当てはまるものをすべて選んでください。
<!-- kind: multiple; skills: dom-error-clear, dom-form-repair -->

- A. エラー文は空のままにする
- B. 入力欄から `aria-invalid` を取り除く
- C. 入力欄の `aria-describedby` を `"true"` に変える
- D. 入力欄の `aria-describedby` は説明欄の `id` を指したままにする

<details>
<summary>解答</summary>

**A, B, D** — 古い文と無効の印を消します。次にエラーが出たときも説明が入力欄に結び付くよう、`aria-describedby` はそのままにします。

</details>
