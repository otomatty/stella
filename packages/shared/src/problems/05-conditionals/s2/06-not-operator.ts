import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05NotOperator: Assignment = {
  id: "S2-Ch05-06-not-operator",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 6,
  title: "! で真偽値を反転する",
  newConcept: "! 演算子は true/false を反転する",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const isLoggedIn = false;\` のとき、 \`!isLoggedIn\` が真なら \`"ログインしてください"\` を出力してください。

## 期待する出力

\`\`\`
ログインしてください
\`\`\`

## ポイント

- \`!\` は **真偽値の反転** を行う演算子です。 \`!true\` は \`false\`、 \`!false\` は \`true\`。
- 「○○ ではない」 という条件を素直に書けます。
`,
  starterFiles: singleFile(`// boolean 値を const の変数に入れる


// その変数の前に ! を付けた条件の if で文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が ログインしてください になる",
      expectedStdout: "ログインしてください",
    },
  ],
  hints: [
    "`!isLoggedIn` は `isLoggedIn` が `false` のとき `true` になります。",
    "`if (!isLoggedIn) { ... }` の中で出力します。",
    "解答例:\n```js\nconst isLoggedIn = false;\nif (!isLoggedIn) {\n  console.log(\"ログインしてください\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const isLoggedIn = false;
if (!isLoggedIn) {
  console.log("ログインしてください");
}
`,
  badSolutions: [
    {
      code: `console.log("ログインしてください");
`,
      description: "if を使わず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "論理 NOT (!)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_NOT", pageTitle: "論理 NOT (!)" },
  ],
};
