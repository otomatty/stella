---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-equality-20261119, SRC-mdn-js-logical-and-20261119, SRC-mdn-js-logical-or-20261119]
---
# 受け取り窓口の条件を修正する

`src/pickup.js` にある 3 つの関数を仕様どおりに修正します。

## 1. クーポン適用後の金額

`couponPrice(total)` は、購入額 `total`（0 円以上の整数）が 1,000 円以上なら 100 円引いた金額を返します。1,000 円未満なら購入額をそのまま返します。

症状は、ちょうど 1,000 円のときに割引されないことです。期待する結果は `couponPrice(1000) → 900` です。

## 2. 注文を渡せるか

`canCollectOrder(isPaid, isReady)` の引数はどちらも真偽値です。`isPaid` は支払い済み、`isReady` は受け取り準備ができていることを表します。注文を渡せるのは両方が `true` のときです。

症状は、支払いが済んだだけで注文を渡せる判定になることです。期待する結果は `canCollectOrder(true, false) → false` です。

## 3. 既定のロッカーか

`isDefaultLocker(code)` の引数は 0 以上の整数か文字列です。数値の `0` なら `true`、それ以外は `false` を返します。

症状は、文字列の `"0"` も既定のロッカーと判定されることです。期待する結果は `isDefaultLocker("0") → false` です。

## 確かめ方

VS Code で「STELLA: 課題を確認する」を実行します。すべて通ったら、各関数で症状が出る入力、原因、直した後に確かめた結果を修正記録に書いて提出します。
