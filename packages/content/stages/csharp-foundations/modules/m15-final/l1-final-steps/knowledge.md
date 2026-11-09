---
sourceRefs: [SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-methods-20261106, SRC-mslearn-csharp-comparison-20261106]
---
## 知識問題

### Q1. 戻り値が期待どおりなら、ログの順番が違っていても仕様どおりです。
<!-- kind: boolean; skills: csharp-final-spec -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 戻り値とログは別々に確かめます。ログは文言、行数、出す順番まで仕様と一致する必要があります。

</details>

### Q2. 修了確認で、コードを書く前に行う作業はどちらですか？
<!-- kind: single; skills: csharp-final-spec -->

- A. 仕様の各分岐に対応する表を作り、手順と必要な部品を決める
- B. 前の完成コードを写し、実行してから期待結果を決める

<details>
<summary>解答</summary>

**A** — 入力・モード・期待ログ・期待戻り値の表を10件以上作ります。手順と部品を決めてから、新しいファイルで実装します。表や手順は自動テストで採点されなくても、自分の確認に使います。

</details>

### Q3. 予約人数の上限を3人から4人に変えた後、どのケースを実行しますか？
<!-- kind: single; skills: csharp-final-spec -->

- A. 新しく受け付ける4人のケースだけ
- B. 前の全ケースと、新しい境界を確かめるケース

<details>
<summary>解答</summary>

**B** — 前の全ケースで、下限やモードごとのログが変わっていないことも確かめます。期待値を変えるのは仕様変更の対象だけです。新しい上限を超える5人のケースも加えます。

</details>
