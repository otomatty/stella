import type { Assignment } from "../../../../../types.js";

/**
 * SQL 入門講座 M2 (WHERE) 用。 ORDER BY は M3 まで未習なので課さず、
 * `orderInsensitive` で行の並び順を無視して採点する。
 */
export const s0SqlCh00WhereOnly: Assignment = {
  id: "S0-Sql-Ch00-05-where-only",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 95,
  title: "SQL: WHERE で行を絞り込む",
  newConcept: "WHERE と比較演算子・AND",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: `CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price INTEGER, stock INTEGER);
INSERT INTO products(name, price, stock) VALUES
  ('コーヒー', 300, 20),
  ('サンドイッチ', 450, 0),
  ('ケーキ', 500, 5),
  ('クッキー', 200, 35),
  ('紅茶', 350, 0);`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- products テーブルから「price が 300 以上」かつ「stock が 1 以上」の
-- name と price を取り出してください。並べ替えは不要です。

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price INTEGER, stock INTEGER);
INSERT INTO products(name, price, stock) VALUES
  ('コーヒー', 300, 20),
  ('サンドイッチ', 450, 0),
  ('ケーキ', 500, 5),
  ('クッキー', 200, 35),
  ('紅茶', 350, 0);
\`\`\`

\`query.sql\` に **「price が 300 以上」かつ「stock が 1 以上」の \`name\` と \`price\`** を取り出す SELECT 文を書いてください。並べ替えは不要です。

## 期待される結果

| name     | price |
|----------|-------|
| コーヒー | 300   |
| ケーキ   | 500   |
`,
  tests: [
    {
      name: "price >= 300 かつ stock >= 1 の行だけ返す",
      orderInsensitive: true,
      expectedColumns: ["name", "price"],
      expectedRows: [
        ["コーヒー", 300],
        ["ケーキ", 500],
      ],
    },
  ],
  hints: [
    "「以上」は `>=` で書きます。",
    "2 つの条件を両方満たす行は `AND` でつなぎます。`WHERE price >= 300 AND stock >= 1`",
  ],
  solution: "SELECT name, price FROM products WHERE price >= 300 AND stock >= 1;\n",
};
