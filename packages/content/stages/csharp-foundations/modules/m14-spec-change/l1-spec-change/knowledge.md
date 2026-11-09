---
sourceRefs: [SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-methods-20261106, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-arithmetic-20261106, SRC-mslearn-gregorian-leap-year-20261109]
---
## 知識問題

### Q1. 月ごとの日数を調べるように変更した後、どのケースを実行し直しますか？
<!-- kind: single; skills: csharp-date-days-change -->

- A. 新しく追加した、月末の日付のケースだけ
- B. 前の全ケースと、変更する条件の境界のケース

<details>
<summary>解答</summary>

**B** — 空白・数字・モードの処理が変わっていないことも確かめます。前のケースもすべて実行し、仕様の変更で結果が変わるものだけ期待値を更新します。

</details>

### Q2. 限定商品の上限を2個とする関数が2を返しました。注文数が上限以下かを調べる正しい比較はどちらですか？
<!-- kind: single; skills: csharp-date-days -->

- A. `quantity <= limit`
- B. `quantity < limit`

<details>
<summary>解答</summary>

**A** — 「以下」は上限ちょうどを含みます。`quantity` が2、`limit` が2なら `<=` は `true`、`<` は `false` です。1以上かの確認は別に必要です。

</details>

### Q3. 基礎課題では1900年も4で割り切れるため、`"19000229"` を成功とする期待値を使います。
<!-- kind: boolean; skills: csharp-date-days -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 基礎課題は4で割り切れる年をうるう年とする簡略な仕様です。1900年が平年になる暦の規則を使うのは、その変更を指定した追加演習です。

</details>
