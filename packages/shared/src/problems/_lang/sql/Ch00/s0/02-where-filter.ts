import type { Assignment } from "../../../../../types.js";

export const s0SqlCh00WhereFilter: Assignment = {
  id: "S0-Sql-Ch00-02-where-filter",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 92,
  title: "SQL: WHERE で条件を絞る",
  newConcept: "WHERE 句で行を絞り込む",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: `CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
INSERT INTO users(name, age) VALUES ('alice', 17), ('bob', 21), ('carol', 30), ('dave', 16);`,
  starterFiles: [
    {
      path: "query.sql",
      content: `-- users テーブルから age が 18 以上の name を昇順で取り出してください。

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
INSERT INTO users(name, age) VALUES ('alice', 17), ('bob', 21), ('carol', 30), ('dave', 16);
\`\`\`

\`query.sql\` に **\`age >= 18\` の \`name\` を昇順で取り出す SELECT 文** を書いてください。

## 期待される結果

| name  |
|-------|
| bob   |
| carol |
`,
  tests: [
    {
      name: "age >= 18 の name を昇順で返す",
      expectedColumns: ["name"],
      expectedRows: [["bob"], ["carol"]],
    },
  ],
  hints: [
    "`WHERE age >= 18` で 18 以上を抽出します。",
    "`ORDER BY name` で文字列の昇順 (A〜Z 順) になります。",
  ],
  solution: "SELECT name FROM users WHERE age >= 18 ORDER BY name;\n",
};
