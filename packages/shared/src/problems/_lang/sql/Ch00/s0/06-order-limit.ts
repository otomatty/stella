import type { Assignment } from "../../../../../types.js";

/** SQL 入門講座 M3 (ORDER BY / LIMIT) 用。 */
export const s0SqlCh00OrderLimit: Assignment = {
  id: "S0-Sql-Ch00-06-order-limit",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 96,
  title: "SQL: 並べ替えて上位だけ取り出す",
  newConcept: "ORDER BY DESC と LIMIT",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: `CREATE TABLE orders(id INTEGER PRIMARY KEY, item TEXT, amount INTEGER);
INSERT INTO orders(item, amount) VALUES
  ('コーヒー', 300),
  ('ケーキセット', 800),
  ('サンドイッチ', 450),
  ('パーティープレート', 2400),
  ('クッキー', 200);`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- orders テーブルから、amount の大きい順に上位 2 件の item と amount を
-- 取り出してください。

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE orders(id INTEGER PRIMARY KEY, item TEXT, amount INTEGER);
INSERT INTO orders(item, amount) VALUES
  ('コーヒー', 300),
  ('ケーキセット', 800),
  ('サンドイッチ', 450),
  ('パーティープレート', 2400),
  ('クッキー', 200);
\`\`\`

\`query.sql\` に **金額 (\`amount\`) の大きい順に上位 2 件の \`item\` と \`amount\`** を取り出す SELECT 文を書いてください。

## 期待される結果

| item               | amount |
|--------------------|--------|
| パーティープレート | 2400   |
| ケーキセット       | 800    |
`,
  tests: [
    {
      name: "amount の降順で上位 2 件を返す",
      expectedColumns: ["item", "amount"],
      expectedRows: [
        ["パーティープレート", 2400],
        ["ケーキセット", 800],
      ],
    },
  ],
  hints: [
    "大きい順 (降順) は `ORDER BY amount DESC` です。",
    "先頭から件数を絞るのは `LIMIT 2` 。ORDER BY のあとに書きます。",
  ],
  solution: "SELECT item, amount FROM orders ORDER BY amount DESC LIMIT 2;\n",
};
