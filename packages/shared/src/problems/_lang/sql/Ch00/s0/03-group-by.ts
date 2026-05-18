import type { Assignment } from "../../../../../types.js";

export const s0SqlCh00GroupBy: Assignment = {
  id: "S0-Sql-Ch00-03-group-by",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 93,
  title: "SQL: GROUP BY で集計する",
  newConcept: "GROUP BY と COUNT で件数集計",
  estimatedMinutes: 5,
  difficulty: 2,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: `CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
INSERT INTO orders(customer, amount) VALUES
  ('alice', 100), ('alice', 200), ('alice', 50),
  ('bob', 300), ('bob', 150),
  ('carol', 80);`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- orders を customer ごとに集計し、 customer と件数を customer 昇順で取り出してください。
-- 期待される列: customer, cnt (それぞれ orders.customer / 件数)

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
INSERT INTO orders(customer, amount) VALUES
  ('alice', 100), ('alice', 200), ('alice', 50),
  ('bob', 300), ('bob', 150),
  ('carol', 80);
\`\`\`

\`query.sql\` で **customer ごとの件数 (\`COUNT(*)\` を \`cnt\` という別名で)** を、 customer 昇順で出力してください。

## 期待される結果

| customer | cnt |
|----------|-----|
| alice    | 3   |
| bob      | 2   |
| carol    | 1   |
`,
  tests: [
    {
      name: "customer ごとの件数を昇順で返す",
      expectedColumns: ["customer", "cnt"],
      expectedRows: [
        ["alice", 3],
        ["bob", 2],
        ["carol", 1],
      ],
    },
  ],
  hints: [
    "`GROUP BY customer` で customer ごとにまとめます。",
    "件数は `COUNT(*)` または `COUNT(id)` 。 `AS cnt` で別名を付けると採点の列名 (`cnt`) と一致します。",
    "`ORDER BY customer` で昇順に並べます。",
  ],
  solution:
    "SELECT customer, COUNT(*) AS cnt FROM orders GROUP BY customer ORDER BY customer;\n",
};
