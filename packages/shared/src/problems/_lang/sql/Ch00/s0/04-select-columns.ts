import type { Assignment } from "../../../../../types.js";

/**
 * SQL 入門講座 M1 (SELECT) 用。 ORDER BY は M3 まで未習なので課さず、
 * `orderInsensitive` で行の並び順を無視して採点する。
 */
export const s0SqlCh00SelectColumns: Assignment = {
  id: "S0-Sql-Ch00-04-select-columns",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 94,
  title: "SQL: 列を選んで取り出す",
  newConcept: "SELECT 列名, 列名 FROM テーブル名",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: `CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price INTEGER, stock INTEGER);
INSERT INTO products(name, price, stock) VALUES
  ('コーヒー', 300, 20),
  ('サンドイッチ', 450, 8),
  ('クッキー', 200, 35);`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- products テーブルから name と price の 2 列だけを取り出してください。
-- 並べ替えは不要です (登録された順のまま出します)。

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price INTEGER, stock INTEGER);
INSERT INTO products(name, price, stock) VALUES
  ('コーヒー', 300, 20),
  ('サンドイッチ', 450, 8),
  ('クッキー', 200, 35);
\`\`\`

\`query.sql\` に **\`name\` と \`price\` の 2 列だけを取り出す SELECT 文** を書いてください。並べ替えは不要です。

## 期待される結果

| name         | price |
|--------------|-------|
| コーヒー     | 300   |
| サンドイッチ | 450   |
| クッキー     | 200   |
`,
  tests: [
    {
      name: "name と price の 2 列を全件返す",
      orderInsensitive: true,
      expectedColumns: ["name", "price"],
      expectedRows: [
        ["コーヒー", 300],
        ["サンドイッチ", 450],
        ["クッキー", 200],
      ],
    },
  ],
  hints: [
    "`SELECT 列名, 列名 FROM テーブル名;` の形です。",
    "列名はカンマで区切って並べます。`SELECT name, price FROM products;`",
  ],
  solution: "SELECT name, price FROM products;\n",
};
