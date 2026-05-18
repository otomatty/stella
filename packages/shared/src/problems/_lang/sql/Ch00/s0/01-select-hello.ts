import type { Assignment } from "../../../../../types.js";

/**
 * SQL 教材の動作確認用 入門課題 (#100 / #109)。
 *
 * sql.js (SQLite) で実行される。 採点ランナは課題ごとに新規 `Database` を作成し、
 * `sqlSeed` を流したあとに学習者の `entryFile` 内容を実行する。 ターミナルタブは
 * 別 DB セッションを持つ (採点に影響しない)。
 */
export const s0SqlCh00SelectHello: Assignment = {
  id: "S0-Sql-Ch00-01-select-hello",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 91,
  title: "SQL: 数値を SELECT する",
  newConcept: "SELECT で式や列を取り出す",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "sql",
  language: "sql",
  entryFile: "query.sql",
  sqlSeed: "CREATE TABLE t(x INT); INSERT INTO t VALUES (1), (2), (3);",
  starterFiles: [
    {
      path: "query.sql",
      content: `-- テーブル t には x=1, 2, 3 が入っています。
-- x を昇順で全件取り出す SELECT 文を書いてください。

`,
    },
  ],
  description: `## やること

採点ランナは事前に次の SQL を流しています:

\`\`\`sql
CREATE TABLE t(x INT);
INSERT INTO t VALUES (1), (2), (3);
\`\`\`

\`query.sql\` に **\`t.x\` を昇順で取り出す SELECT 文** を 1 つ書いてください。

ターミナルタブで \`SELECT * FROM t;\` 等を試して動作を確かめられます (採点 DB とは独立)。

## 期待される結果

| x |
|---|
| 1 |
| 2 |
| 3 |
`,
  tests: [
    {
      name: "x を昇順で 3 件返す",
      expectedColumns: ["x"],
      expectedRows: [[1], [2], [3]],
    },
  ],
  hints: [
    "`SELECT 列名 FROM テーブル名 ORDER BY 列名` の形が基本です。",
    "`ORDER BY x` で昇順 (ASC) になります。",
  ],
  solution: "SELECT x FROM t ORDER BY x;\n",
};
