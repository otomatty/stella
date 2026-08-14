import type { Assignment } from "../../../../../types.js";

/** SQL 入門講座 M5 (集計) 用。 GROUP BY した結果を HAVING で絞る。 */
export const s0SqlCh00GroupHaving: Assignment = {
  id: "S0-Sql-Ch00-09-group-having",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 99,
  title: "SQL: HAVING で集計結果を絞る",
  newConcept: "SUM + GROUP BY + HAVING",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: `CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
INSERT INTO orders(customer, amount) VALUES
  ('alice', 100), ('alice', 250),
  ('bob', 120),
  ('carol', 300), ('carol', 80), ('carol', 40);`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- orders を customer ごとに集計し、amount の合計 (別名 total) が 300 以上の
-- customer と total を customer の昇順で取り出してください。

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
INSERT INTO orders(customer, amount) VALUES
  ('alice', 100), ('alice', 250),
  ('bob', 120),
  ('carol', 300), ('carol', 80), ('carol', 40);
\`\`\`

\`query.sql\` に **customer ごとの \`amount\` 合計 (\`SUM(amount)\` を \`total\` という別名で) を出し、合計が 300 以上のものだけを customer 昇順で取り出す** SELECT 文を書いてください。

## 期待される結果

| customer | total |
|----------|-------|
| alice    | 350   |
| carol    | 420   |
`,
  tests: [
    {
      name: "合計 300 以上の customer と total を昇順で返す",
      expectedColumns: ["customer", "total"],
      expectedRows: [
        ["alice", 350],
        ["carol", 420],
      ],
    },
  ],
  hints: [
    "合計は `SUM(amount) AS total` 。グループ化は `GROUP BY customer` です。",
    "集計した結果への条件は WHERE ではなく `HAVING total >= 300` に書きます。",
    "最後に `ORDER BY customer` で昇順に並べます。",
  ],
  solution:
    "SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer HAVING total >= 300 ORDER BY customer;\n",
};
