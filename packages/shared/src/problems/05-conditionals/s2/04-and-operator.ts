import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05AndOperator: Assignment = {
  id: "S2-Ch05-04-and-operator",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 4,
  title: "&& で複数条件を AND 連結する",
  newConcept: "&& は両方真のときだけ真になる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const age = 25;\` と \`const hasTicket = true;\` の **両方** を満たす場合のみ \`"OK"\` を出力してください。 条件:

- 年齢が 18 以上
- かつチケットを持っている

## 期待する出力

\`\`\`
OK
\`\`\`

## ポイント

- \`A && B\` は **A と B の両方が真** のときだけ真になります。
- \`if (age >= 18 && hasTicket) { ... }\` のように 1 つの条件式にまとめます。
`,
  starterFiles: singleFile(`// 年齢 (数値) とチケット有無 (boolean) を、 それぞれ const の変数に入れる


// && で 2 つの条件を AND 結合した if で文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が OK になる",
      expectedStdout: "OK",
    },
  ],
  hints: [
    "`age >= 18 && hasTicket` で AND 条件にできます。",
    "`if (条件) { console.log(\"OK\"); }` の中で出力します。",
    "解答例:\n```js\nconst age = 25;\nconst hasTicket = true;\nif (age >= 18 && hasTicket) {\n  console.log(\"OK\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "LogicalExpression", label: "&& で複数条件をつなぐ" },
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const age = 25;
const hasTicket = true;
if (age >= 18 && hasTicket) {
  console.log("OK");
}
`,
  badSolutions: [
    {
      code: `console.log("OK");
`,
      description: "条件式を書かず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "論理 AND (&&)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_AND", pageTitle: "論理 AND (&&)" },
  ],
};
