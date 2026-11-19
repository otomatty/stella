---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-logical-and-20261119, SRC-mdn-js-return-20261119]
---
# 映画館のチケット料金を決める

`src/cinema.js` の `ticketPrice(age, isWeekday, isMember)` は、チケット 1 枚の料金を円単位の整数で返します。

- `age` は 0 以上の整数です。
- `isWeekday` は月曜から金曜なら `true`、土曜と日曜なら `false` です。祝日は考慮しません。
- `isMember` は会員なら `true`、非会員なら `false` です。

| 対象 | 料金 |
| --- | ---: |
| 12 歳未満 | 曜日・会員区分を問わず 1,000 円 |
| 12〜64 歳で、平日の会員 | 1,400 円 |
| 12〜64 歳で、上の割引が適用されない人 | 1,800 円 |
| 65 歳以上 | 曜日・会員区分を問わず 1,200 円 |

## 例

- `ticketPrice(11, true, true) → 1000`
- `ticketPrice(30, true, true) → 1400`
- `ticketPrice(30, false, true) → 1800`
- `ticketPrice(65, true, false) → 1200`
