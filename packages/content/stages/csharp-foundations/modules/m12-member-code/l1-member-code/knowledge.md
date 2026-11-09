---
sourceRefs: [SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-methods-20261106, SRC-mslearn-csharp-contains-20261108, SRC-mslearn-csharp-replace-20261108, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-parse-20261106]
---
## 知識問題

### Q1. 期待ログと期待戻り値を表に書く方法として、正しいものはどれですか？
<!-- kind: single; skills: csharp-member-code -->

- A. 仕様で決まるログを出る順に並べ、戻り値は別の欄に書く
- B. 戻り値が合っていれば、ログの文や順番は記録しない

<details>
<summary>解答</summary>

**A** — ログと戻り値は別々に確かめます。ログなしの場合は、空の行も出しません。

</details>

### Q2. 空白を削除した文字列だけから、削除前に空白があったかを判断できます。
<!-- kind: boolean; skills: csharp-member-code -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — `"A B"` と `"AB"` は、空白を削除すると同じ `"AB"` です。削除前に `Contains` で調べておきます。

</details>

### Q3. 会員コードの桁数を整数への変換だけで判断しない理由はどれですか？
<!-- kind: single; skills: csharp-member-code -->

- A. `"01234567"` と `"1234567"` が同じ整数になり、元の桁数を区別できないため
- B. 先頭が0の会員コードは、元の8桁仕様でも必ず不正になるため

<details>
<summary>解答</summary>

**A** — 元の8桁仕様は先頭0を許可しています。文字列の長さと、各文字が半角数字かを調べます。

</details>
