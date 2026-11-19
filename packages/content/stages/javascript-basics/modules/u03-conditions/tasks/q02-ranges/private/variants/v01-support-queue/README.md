# サポート依頼の優先度を分ける

`src/support-queue.js` の `queuePriority(pendingCount)` を完成させます。`pendingCount` は未対応のサポート依頼の件数で、0 以上の整数です。

| 未対応件数 | 返す優先度 |
| --- | --- |
| 15 件以上 | `"urgent"` |
| 5〜14 件 | `"soon"` |
| 4 件以下 | `"normal"` |

例は `queuePriority(8) → "soon"` です。
