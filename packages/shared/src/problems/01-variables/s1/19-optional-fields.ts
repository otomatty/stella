import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01OptionalFields: Assignment = {
  id: "S1-Ch01-161-optional-fields",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 19,
  title: "「値がないこともある」を型で表す",
  newConcept: "値がないかもしれない項目は string | undefined で表す",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

任意入力の項目を表す変数を 2 つ宣言してください。 どちらも「値がまだない」状態から始めます。 型注釈を付けて、 「値がないこともある」ことを型で表現してください。

- 発送日 \`shippedAt\` (文字列。 未発送のときは値がない)
- 備考 \`note\` (文字列。 未入力のときは値がない)

宣言したら 2 つを順に表示し、 そのあと \`shippedAt\` に \`"2026-08-09"\` を入れてもう一度表示してください。

## 期待する出力

\`\`\`
undefined
undefined
2026-08-09
\`\`\`

## ポイント

- 「文字列が入ることもあるし、 値がないこともある」をユニオン型 \`string | undefined\` で表します。
- 本研修の方針では、 「値がない」は \`null\` ではなく \`undefined\` に統一します。
- \`string\` だけにすると「必ず値がある」という嘘になり、 後で困ります。
`,
  starterFiles: singleFile(
    `// 発送日（文字列。 値がないこともある）


// 備考（文字列。 値がないこともある）


// 2 つを順に表示する


// 発送日に "2026-08-09" を入れて、 もう一度表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "未設定の 2 行と、 更新後の発送日が出力される",
      expectedStdout: "undefined\nundefined\n2026-08-09",
    },
  ],
  hints: [
    "「値がない」ことを表す値は `undefined` です。 型にも値にも書けます。",
    "書き方は `let shippedAt: string | undefined = undefined;` です。 あとで値を入れるので `let` を使います。",
    '解答例:\n```ts\nlet shippedAt: string | undefined = undefined;\nlet note: string | undefined = undefined;\n\nconsole.log(shippedAt);\nconsole.log(note);\n\nshippedAt = "2026-08-09";\nconsole.log(shippedAt);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `let shippedAt: string | undefined = undefined;
let note: string | undefined = undefined;

console.log(shippedAt);
console.log(note);

shippedAt = "2026-08-09";
console.log(shippedAt);
`,
  badSolutions: [
    {
      code: `let shippedAt: string = "";
let note: string = "";

console.log(shippedAt);
console.log(note);

shippedAt = "2026-08-09";
console.log(shippedAt);
`,
      description:
        "「値がない」を空文字で代用しており、 未入力と空文字が区別できなくなっている",
    },
  ],
  mdnSections: [{ heading: "データ型" }, { heading: "宣言と初期化" }],
};
