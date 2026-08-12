import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05FixElseIfOrder: Assignment = {
  id: "S2-Ch05-223-fix-else-if-order",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 16,
  title: "else if の順序が結果を変える",
  newConcept: "最初に当たった 1 つだけが実行される",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 300 ポイントの人に「シルバー会員」と表示したいのに「一般会員」と表示されます。

\`\`\`ts
const point = 300;

if (point < 100) {
  console.log("一般会員");
} else if (point < 1000) {
  console.log("一般会員");
} else if (point >= 100) {
  console.log("シルバー会員");
}
\`\`\`

原因を突き止め、 「シルバー会員」と表示されるよう直してください。 判定のルールは次のとおりです。

- 1000 以上 → 「ゴールド会員」
- 100 以上 1000 未満 → 「シルバー会員」
- 100 未満 → 「一般会員」

## 期待する出力

\`\`\`
シルバー会員
\`\`\`

## ポイント

- \`if\` / \`else if\` を重ねたとき、 実行されるのは **最初に当たった 1 つだけ** です。 当たった時点で残りは見ません。
- 元のコードは 2 つ目の \`point < 1000\` に 300 が当たり、 そこで確定していました。 3 つ目の分岐には永遠に届きません。
- 範囲の分岐は、 **大きいほうから順に \`>=\` で書く** と考えやすくなります。
- \`else if\` をやめてすべて独立した \`if\` にすると、 今度は当たった分岐が全部実行されてしまいます。
`,
  starterFiles: singleFile(
    `// 300 ポイントなのに「一般会員」と表示される。 原因を直すこと。

const point = 300;

if (point < 100) {
  console.log("一般会員");
} else if (point < 1000) {
  console.log("一般会員");
} else if (point >= 100) {
  console.log("シルバー会員");
}
`,
    "main.ts",
  ),
  tests: [
    {
      name: "シルバー会員が出力される",
      expectedStdout: "シルバー会員",
    },
  ],
  hints: [
    "`point` は 300 です。 上から順に条件を当てはめていくと、 どこで止まるでしょうか。",
    "条件の中身を直すより、 **大きいほうから順に `>=` で並べ直す** ほうが早く、 読み違えも減ります。",
    '解答例:\n```ts\nconst point = 300;\n\nif (point >= 1000) {\n  console.log("ゴールド会員");\n} else if (point >= 100) {\n  console.log("シルバー会員");\n} else {\n  console.log("一般会員");\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const point = 300;

if (point >= 1000) {
  console.log("ゴールド会員");
} else if (point >= 100) {
  console.log("シルバー会員");
} else {
  console.log("一般会員");
}
`,
  badSolutions: [
    {
      code: `const point = 300;

if (point >= 1000) {
  console.log("ゴールド会員");
}
if (point >= 100) {
  console.log("シルバー会員");
}
if (point < 1000) {
  console.log("一般会員");
}
`,
      description:
        "else if をやめてすべて独立した if にしたため、 当たった分岐が両方実行されて 2 行出力される",
    },
  ],
  mdnSections: [
    { heading: "条件文" },
    { heading: "if...else 文", anchor: "if...else_文" },
  ],
};
