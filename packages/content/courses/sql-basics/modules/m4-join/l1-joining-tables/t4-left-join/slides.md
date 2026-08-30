---
id: 4-1-4
title: LEFT JOINで左の行を全部残す
takeaway: "LEFT JOIN は左のテーブルの行を全部残し、相手がいない部分は NULL になる"
introduces: [LEFT JOIN]
requires: [INNER JOIN, NULL]
header: "SQL入門"
---

<!-- _class: lead -->

# 4-1-4
# LEFT JOINで左の行を全部残す

SQL入門 — Module 4 / レッスン4-1

<!-- ノート: INNER JOINには「消える行」があります。それを消さずに残したいときの、もう1つのJOINです。 -->

---

## なぜ必要か

- 高橋さんはまだ一度も注文していない
- INNER JOIN は一致する相手がいる行しか残さないので、高橋さんが結果から消える
- 「全顧客の一覧」を作りたいときは、それでは困る

<!-- ノート: つかみ。全顧客に案内を送る一覧を作ったのに、注文ゼロの人が抜けていた、という失敗談で動機を作る。 -->

---

## 結論

**LEFT JOIN は左のテーブルの行を全部残し、相手がいない部分は NULL になる**

- 左 = `FROM` に書いたテーブル
- 相手が見つからなくても行は消えず、埋まらない部分が NULL になる

<!-- ノート: 結論。「左」がFROM側だと明言する。NULLはM2で出た「値が入っていない」印。ここで再登場する。 -->

---

## 最小のコード

```sql
SELECT name, item
FROM customers
LEFT JOIN orders
  ON customers.id = orders.customer_id;
```

| name | item |
| --- | --- |
| 佐藤 | コーヒー |
| 佐藤 | クッキー |
| 鈴木 | ケーキセット |
| 高橋 | NULL |

<!-- ノート: 顧客の一覧が主役なので、FROMがcustomersになっている点に注目。高橋さんの行が残り、itemがNULLで埋まる。 -->

---

## INNER JOIN との違い

| | 結果に残る行 | 相手がいない行 |
| --- | --- | --- |
| INNER JOIN | 一致した行だけ | 消える |
| LEFT JOIN | 左は全部 | NULL で残る |

<!-- ノート: 対比。「消えて困るならLEFT、一致だけでいいならINNER」という選び方まで言い切る。 -->

---

<!-- _class: summary -->

## まとめ

**LEFT JOIN は左のテーブルの行を全部残し、相手がいない部分は NULL になる**

<!-- ノート: 結論の再掲だけ。JOINした結果をさらに絞ったり並べ替えたりできるのか、という問いを残して締める。 -->
