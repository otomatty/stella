---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-equality-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-logical-and-20261119, SRC-mdn-js-logical-or-20261119, SRC-mdn-js-logical-not-20261119, SRC-mdn-js-return-20261119]
---
# 条件を組み合わせて例外を先に返す

仕様にある「かつ」「または」を条件式にする練習です。6 問のうち、例外を先に返す問題では、例外の分岐を先に書き、通常の処理をその後に置きます。窓口の問題では `!` で真偽値を反転します。

`src/conditions.js` の関数を完成させます。各関数の名前と引数はそのまま使い、仮の本体を置き換えます。結果は `return` で返します。

## 1. 会員割引を使えるか

`canUseMemberDiscount(isMember, total)`

会員かどうかを示す真偽値 `isMember` が `true` で、注文金額 `total`（0 円以上の整数）が 5,000 円以上なら `true`、それ以外は `false` を返します。

例は `canUseMemberDiscount(true, 6000) → true` です。

## 2. 通知を送れるか

`canSendNotice(isWeekday, hour)`

平日かどうかを示す真偽値 `isWeekday` と時刻 `hour`（0〜23 の整数）を受け取ります。平日または 18 時以降の少なくとも一方が成り立てば `true`、それ以外は `false` を返します。

例は `canSendNotice(false, 21) → true` です。

## 3. 申し込みを受け付けられるか

`canAcceptRequest(isOpen, slots)`

窓口が開いているかを示す真偽値 `isOpen` と空き枠数 `slots`（0 以上の整数）を受け取ります。閉まっている場合は先に `false` を返します。開いている場合は空きが 1 枠以上なら `true`、0 枠なら `false` です。

例は `canAcceptRequest(true, 3) → true` です。

## 4. 受け取りコードを確かめる

`checkPickupCode(inputCode, expectedCode)`

`inputCode` と `expectedCode` は文字列で、`expectedCode` は空でありません。入力が空文字なら先に `null` を返します。それ以外は文字の並びが同じなら `true`、異なれば `false` を返します。空白も文字として扱います。

例は `checkPickupCode("P12", "P12") → true` です。

## 5. 受け取り時間内か

`isPickupHour(hour)`

時刻 `hour`（0〜23 の整数）が 9 時以上かつ 17 時未満なら `true`、それ以外は `false` を返します。9 時は受け取れます。17 時には受付が終了します。

例は `isPickupHour(12) → true` です。

## 6. 取り置きできるか

`canReserveItem(isSuspended, stock, hasVoucher)`

利用停止かどうかを示す真偽値 `isSuspended`、在庫数 `stock`（0 以上の整数）、取り置き券を持っているかを示す真偽値 `hasVoucher` を受け取ります。利用停止中は先に `false` を返します。それ以外は在庫が 1 個以上、または取り置き券ありの少なくとも一方が成り立てば `true`、どちらも成り立たなければ `false` です。

例は `canReserveItem(false, 0, true) → true` です。

## 確かめ方

1. VS Code のコマンドパレットから「STELLA: 課題を確認する」を実行します。
2. テストが通らなければ、失敗した入力と期待する戻り値を見比べます。境界では、直前・ちょうど・直後を確かめます。
3. 修正したらもう一度確認し、すべて通ったら提出します。
