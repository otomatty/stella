---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-equality-20261119]
---
# 比べて真偽値を返す

大小や等しさを比べ、比較の結果を真偽値で返す練習です。8 問とも、比較式の結果をそのまま `return` します。

`src/checks.js` の関数を完成させます。各関数の名前と引数はそのまま使い、仮の本体を置き換えます。結果は `return` で返します。

## 1. 送料無料か

`isFreeShipping(total)`

注文金額 `total`（0 円以上の整数）が 3,000 円以上なら `true`、未満なら `false` を返します。

例は `isFreeShipping(4500) → true` です。

## 2. 成人か

`isAdult(age)`

年齢 `age`（0 歳以上の整数）が 18 歳以上なら `true`、未満なら `false` を返します。

例は `isAdult(30) → true` です。

## 3. 満点か

`isPerfectScore(score)`

点数 `score`（0 以上の整数）がちょうど 100 点なら `true`、それ以外なら `false` を返します。入力には 100 を超える点数も含まれます。

例は `isPerfectScore(80) → false` です。

## 4. 在庫があるか

`hasStock(stock)`

在庫数 `stock`（整数）が 0 個より多いなら `true`、0 個以下なら `false` を返します。棚卸し前の在庫数は負の値になることがあります。

例は `hasStock(2) → true` です。

## 5. 商品コードが同じか

`matchesProductCode(inputCode, productCode)`

`productCode` は空でない文字列です。入力された `inputCode`（文字列または数値）が、型も文字の並びも同じときだけ `true` を返します。大文字と小文字は区別し、それ以外は `false` を返します。

例は `matchesProductCode("P12", "P12") → true` です。

## 6. 締切を過ぎたか

`isPastDeadline(minute, deadline)`

現在時刻 `minute` と締切 `deadline` は、同じ日の午前 0 時からの経過分（0〜1,439 の整数）です。現在時刻が締切より後なら `true`、締切ちょうどかそれより前なら `false` を返します。

例は `isPastDeadline(720, 700) → true` です。

## 7. 定員を超えたか

`isOverCapacity(count, capacity)`

申込件数 `count` と定員 `capacity` は 0 以上の整数です。件数が定員より多いなら `true`、定員以下なら `false` を返します。受付できる人数が 0 人の場合もあります。

例は `isOverCapacity(25, 20) → true` です。

## 8. 空文字か

`isEmptyText(text)`

`text` は文字列です。文字が 0 個の空文字だけ `true`、1 文字以上なら `false` を返します。空白も 1 文字として扱います。

例は `isEmptyText("STELLA") → false` です。

## 確かめ方

1. VS Code のコマンドパレットから「STELLA: 課題を確認する」を実行します。
2. テストが通らなければ、失敗した入力と期待する戻り値を見比べます。境界では、直前・ちょうど・直後を確かめます。
3. 修正したらもう一度確認し、すべて通ったら提出します。
