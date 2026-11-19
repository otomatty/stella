---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-logical-or-20261119, SRC-mdn-js-return-20261119]
---
# 確認A 図書館の貸出可否と延滞料

公式ドキュメント（MDN）と文法は参照できます。ヒント・AI チャットは使えません。

`src/library.js` の `loanLateFee(isSuspended, borrowedCount, overdueDays)` を完成させます。図書館の窓口で新たに 1 冊借りられるかを判定し、借りられる場合は精算する延滞料を返します。

- `isSuspended` は利用停止中なら `true` の真偽値です。
- `borrowedCount` は返却後も借りている冊数です。0 以上の整数です。
- `overdueDays` は、今回返却する本の延滞日数です。0 以上の整数で、延滞なしは 0 です。

利用停止中、または貸出中の本が 5 冊以上なら、新たに借りられないので `null` を返します。

借りられる場合、延滞の最初の 2 日間は無料で、3 日目から 1 日につき 50 円かかります。延滞料を円単位の整数で返します。

## 例

- `loanLateFee(true, 1, 0) → null`
- `loanLateFee(false, 4, 2) → 0`
- `loanLateFee(false, 4, 4) → 100`

## 確かめ方

VS Code で「STELLA: 課題を確認する」を実行します。すべて通ったら提出します。
