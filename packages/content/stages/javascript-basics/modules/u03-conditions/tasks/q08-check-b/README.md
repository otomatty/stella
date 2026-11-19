---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-logical-and-20261119, SRC-mdn-js-logical-not-20261119, SRC-mdn-js-return-20261119]
---
# 確認B 駐車場の料金区分

公式ドキュメント（MDN）と文法は参照できます。ヒント・AI チャットは使えません。

`src/parking.js` の `parkingRate(minutes, hasShopStamp, hasTicket)` は、駐車場の料金区分を文字列で返します。

- `minutes` は駐車した分数です。0 以上の整数です。
- `hasShopStamp` は店舗の利用印が確認できたら `true` の真偽値です。
- `hasTicket` は駐車券があれば `true` の真偽値です。

| 条件 | 返す区分 |
| --- | --- |
| 駐車券を紛失した（`hasTicket` が `false`） | `"lost-ticket"` |
| 駐車券があり、30 分以内で店舗の利用印がある | `"free"` |
| 駐車券があり、180 分以上 | `"daily"` |
| 駐車券があり、上のどの区分にも当てはまらない | `"standard"` |

## 例

- `parkingRate(20, true, false) → "lost-ticket"`
- `parkingRate(30, true, true) → "free"`
- `parkingRate(31, true, true) → "standard"`
- `parkingRate(180, false, true) → "daily"`

## 確かめ方

VS Code で「STELLA: 課題を確認する」を実行します。すべて通ったら提出します。
