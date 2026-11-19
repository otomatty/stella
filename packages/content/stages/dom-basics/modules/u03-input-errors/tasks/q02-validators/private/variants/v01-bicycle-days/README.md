---
sourceRefs: [SRC-mdn-js-trim-20261119, SRC-mdn-js-number-20261119, SRC-mdn-js-comparison-20261119, SRC-mdn-js-equality-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-return-20261119]
---
# 自転車の貸出日数を検証する

`src/rental-days.js` の `validateDays(value)` は、貸出日数を文字列で受け取ります。2〜14 の整数なら空文字を返します。それ以外なら「貸出日数は2〜14の整数で入力してください。」を返します。

画面の「確認する」を押すと、関数が返したエラー文を表示します。有効な場合は「貸出日数を確認しました。」と表示します。
