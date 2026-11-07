---
sourceRefs: [SRC-mslearn-csharp-string-20261106, SRC-mslearn-csharp-substring-20261106]
---
## 知識問題

### Q1. 文字列の末尾の文字は、どれで読めますか？
<!-- kind: single; skills: csharp-string-length -->

- A. `s[s.Length - 1]`
- B. `s[s.Length]`

<details>
<summary>解答</summary>

**A** — 末尾の位置は Length - 1 です。Length の位置は範囲の外です。

</details>

### Q2. 空文字の半角数字の個数は 0 です。
<!-- kind: boolean; skills: csharp-string-count -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 空文字はループが 0 回なので、個数の箱は 0 のままです。

</details>

### Q3. 8 文字の先頭 4 文字 "0999" を年として返すとき、どれが合いますか？
<!-- kind: single; skills: csharp-string-slice -->

- A. `s.Substring(0, 4)` を文字列のまま返す
- B. `int.Parse` してから文字列に戻す

<details>
<summary>解答</summary>

**A** — 数値にすると先頭の 0 が消えて "999" になります。

</details>
