---
sourceRefs: [SRC-mslearn-csharp-substring-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-methods-20261106]
---
## 知識問題

### Q1. 数字6文字と確認できている商品コード `"482705"` から、`Substring(2, 2)` で切り出して `int.Parse` すると、どの値になりますか？
<!-- kind: single; skills: csharp-date-check -->

- A. 整数の27
- B. 整数の82

<details>
<summary>解答</summary>

**A** — 開始位置は0から数えます。位置2から2文字を切り出すと `"27"` になり、整数に変換すると27です。

</details>

### Q2. 元の仕様で `"2026 1332"` を Import に渡すと、どの順にログが出ますか？
<!-- kind: single; skills: csharp-date-check -->

- A. 「日付が正しくありません」だけが出る
- B. 「空白を削除しました」の後に「日付が正しくありません」が出る

<details>
<summary>解答</summary>

**B** — 空白を削除すると数字8桁です。削除ログを出した後に月と日を調べ、日付のエラーを出します。戻り値は `"Err"` です。

</details>

### Q3. 元の仕様を再実装する問題では、実際の暦にない日付をすべて失敗にするため、月ごとの日数とうるう年の判定も足します。
<!-- kind: boolean; skills: csharp-date-change -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 元の仕様は月01〜12、日01〜31だけを確認します。`"20260231"` も成功です。指定されていない条件は足しません。

</details>
