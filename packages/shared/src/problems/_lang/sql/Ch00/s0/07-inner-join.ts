import type { Assignment } from "../../../../../types.js";

/** SQL 入門講座 M4 (JOIN) 用。 ORDER BY は M3 で習得済みの前提。 */
export const s0SqlCh00InnerJoin: Assignment = {
  id: "S0-Sql-Ch00-07-inner-join",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 97,
  title: "SQL: INNER JOIN で結合する",
  newConcept: "INNER JOIN ... ON で 2 テーブルをつなぐ",
  estimatedMinutes: 5,
  difficulty: 2,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: `CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO customers(name) VALUES ('佐藤'), ('鈴木'), ('高橋');
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER, item TEXT);
INSERT INTO orders(customer_id, item) VALUES
  (1, 'コーヒー'),
  (2, 'ケーキセット'),
  (1, 'クッキー');`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- orders と customers を customer_id で結合し、注文ごとに
-- 顧客の name と注文の item を orders.id の昇順で取り出してください。

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO customers(name) VALUES ('佐藤'), ('鈴木'), ('高橋');
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER, item TEXT);
INSERT INTO orders(customer_id, item) VALUES
  (1, 'コーヒー'),
  (2, 'ケーキセット'),
  (1, 'クッキー');
\`\`\`

\`query.sql\` に **orders と customers を INNER JOIN で結合し、顧客の \`name\` と注文の \`item\` を \`orders.id\` の昇順で取り出す** SELECT 文を書いてください。

## 期待される結果

| name | item         |
|------|--------------|
| 佐藤 | コーヒー     |
| 鈴木 | ケーキセット |
| 佐藤 | クッキー     |
`,
  tests: [
    {
      name: "注文ごとに顧客名と品名を orders.id 順で返す",
      expectedColumns: ["name", "item"],
      expectedRows: [
        ["佐藤", "コーヒー"],
        ["鈴木", "ケーキセット"],
        ["佐藤", "クッキー"],
      ],
    },
  ],
  hints: [
    "`FROM orders INNER JOIN customers ON orders.customer_id = customers.id` の形です。",
    "取り出す列は `customers.name, orders.item` のように テーブル名.列名 で書くと迷いません。",
    "並び順は `ORDER BY orders.id` で固定します。",
  ],
  solution:
    "SELECT customers.name, orders.item FROM orders INNER JOIN customers ON orders.customer_id = customers.id ORDER BY orders.id;\n",
};
