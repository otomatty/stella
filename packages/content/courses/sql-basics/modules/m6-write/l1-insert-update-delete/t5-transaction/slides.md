---
id: 6-1-5
title: トランザクションなら取り消せる
takeaway: "BEGINで始めた変更は、COMMITで確定するかROLLBACKで取り消せる"
introduces: [トランザクション, COMMIT, ROLLBACK]
requires: [全行, UPDATE, DELETE, INSERT, SQL文]
header: "SQL入門"
---

<!-- _class: lead -->

# 6-1-5
# トランザクションなら取り消せる

SQL入門 — Module 6 / レッスン6-1

<!-- ノート: 書き込みを安全に行うための最後の道具です。詳細な理論には踏み込みません。 -->

---

## なぜ必要か

- 実行した瞬間に確定してしまうと、間違いに気づいても戻せない
- 複数の更新のうち1つだけ失敗すると、中途半端な状態が残る

<!-- ノート: つかみ。振込の入金と出金の例を口頭で添えると伝わります。 -->

---

## 結論

**BEGINで始めた変更は、COMMITで確定するかROLLBACKで取り消せる**

- **トランザクション** — まとめて確定・取り消しできる作業のかたまり
- **COMMIT** — 確定する / **ROLLBACK** — 取り消す

<!-- ノート: 結論を先に言い切ります。確定するまでは他から見えない、という性質も添えます。 -->

---

## 確かめてから確定する

```sql
BEGIN;
UPDATE products SET price = 250 WHERE id = 1;
SELECT * FROM products WHERE id = 1;   -- 結果を確かめる

ROLLBACK;   -- 取り消す(COMMIT なら確定)
```

- 本番のデータを直すときは、この形が基本

<!-- ノート: 実務では BEGIN → 確認 → COMMIT が定石です。手順として覚えさせます。 -->

---

<!-- _class: summary -->

## まとめ

**BEGINで始めた変更は、COMMITで確定するかROLLBACKで取り消せる**

<!-- ノート: 結論の再掲だけ。書き込みの道具はこれでそろいました。 -->
