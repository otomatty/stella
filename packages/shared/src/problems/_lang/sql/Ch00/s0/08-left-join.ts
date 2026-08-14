import type { Assignment } from "../../../../../types.js";

/** SQL 入門講座 M4 (JOIN) 用。 相手のいない行が NULL で残ることを確かめる。 */
export const s0SqlCh00LeftJoin: Assignment = {
  id: "S0-Sql-Ch00-08-left-join",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 98,
  title: "SQL: LEFT JOIN で全員を残す",
  newConcept: "LEFT JOIN は左の行を全部残し、相手が無ければ NULL",
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
  (2, 'ケーキセット');`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- 注文が 1 件も無い顧客も含めて、全顧客の name と注文の item を
-- customers.id の昇順で取り出してください。
-- 注文が無い顧客の item は NULL のままで構いません。

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
  (2, 'ケーキセット');
\`\`\`

\`query.sql\` に **注文が無い顧客も含めた全顧客の \`name\` と \`item\` を \`customers.id\` の昇順で取り出す** SELECT 文を書いてください。INNER JOIN だと高橋さんが消えてしまう点がポイントです。

## 期待される結果

| name | item         |
|------|--------------|
| 佐藤 | コーヒー     |
| 鈴木 | ケーキセット |
| 高橋 | NULL         |
`,
  tests: [
    {
      name: "注文の無い顧客も NULL で残して返す",
      expectedColumns: ["name", "item"],
      expectedRows: [
        ["佐藤", "コーヒー"],
        ["鈴木", "ケーキセット"],
        ["高橋", null],
      ],
    },
  ],
  hints: [
    "全部残したい側 (customers) を左に置いて `FROM customers LEFT JOIN orders` とします。",
    "結合条件は `ON orders.customer_id = customers.id` です。",
    "並び順は `ORDER BY customers.id` で固定します。",
  ],
  solution:
    "SELECT customers.name, orders.item FROM customers LEFT JOIN orders ON orders.customer_id = customers.id ORDER BY customers.id;\n",
};
