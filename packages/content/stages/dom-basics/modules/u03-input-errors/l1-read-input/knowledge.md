---
sourceRefs: [SRC-mdn-dom-input-value-20261119, SRC-mdn-js-trim-20261119, SRC-mdn-js-number-20261119, SRC-mdn-dom-submit-event-20261119, SRC-mdn-dom-prevent-default-20261119]
---

## 知識問題

### Q1. 数量欄 `<input type="number">` に 12 が入っています。`input.value` を読むと何が得られますか？
<!-- kind: single; skills: dom-input-value -->

- A. 数値の `12`
- B. 文字列の `"12"`
- C. 真偽値の `true`

<details>
<summary>解答</summary>

**B** — `type="number"` の入力欄でも、`value` が返すのは文字列です。

</details>

### Q2. `trim()` で `"  山田 太郎  "` の前後の空白を除くと、名前の途中の空白も消えます。
<!-- kind: boolean; skills: dom-input-value -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — `trim()` は文字列の前後の空白だけを除きます。結果は `"山田 太郎"` です。

</details>

### Q3. 数量欄の未入力と数値の 0 を区別してから計算するには、どの処理が必要ですか？ 当てはまるものをすべて選んでください。
<!-- kind: multiple; skills: dom-input-value -->

- A. 変換前に、`trim()` の結果が `""` か確かめる
- B. `Number()` を使ってから、数値の 0 はすべて未入力とみなす
- C. 入力があれば、計算前に `Number()` で数値に変換する

<details>
<summary>解答</summary>

**A, C** — 空文字も `Number()` では 0 になります。空欄は文字列の段階で見分け、入力があるときは数値へ変換します。

</details>

### Q4. 送信ボタンでも、名前欄で Enter キーを押して送信したときでも、入力内容を表示するにはどうしますか？
<!-- kind: single; skills: dom-submit-event -->

- A. フォームに `submit` の処理を登録する
- B. 名前欄に `submit` の処理を登録する
- C. 送信ボタンを押したときだけ、名前欄の値を読む

<details>
<summary>解答</summary>

**A** — `submit` はフォームに届きます。フォームに登録した処理で、送信のきっかけによらず値を読めます。

</details>

### Q5. `submit` の処理で `event.preventDefault()` を呼んだあとも、同じ処理の中で入力欄の値を読めます。
<!-- kind: boolean; skills: dom-submit-event -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 止まるのはブラウザーが通常行う送信です。登録した処理は次の行に進むので、そこで `value` を読めます。

</details>
