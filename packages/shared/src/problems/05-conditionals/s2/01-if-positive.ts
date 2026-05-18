import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05IfPositive: Assignment = {
  id: "S2-Ch05-01-if-positive",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 1,
  title: "if で正数なら 'positive' と出す",
  newConcept: "if 文で条件が真のときだけ実行する",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const value = 5;\` に対して、 \`value > 0\` なら \`"positive"\` と出力してください。 \`if\` 文を使います。

\`\`\`js
if (条件) {
  // 真のとき実行
}
\`\`\`

## 期待する出力

\`\`\`
positive
\`\`\`

## ポイント

- \`if (条件) { ... }\` の \`条件\` には **真偽値になる式** を書きます。
- \`>\` は大小比較。 \`value > 0\` は \`true\` か \`false\` になります。
`,
  starterFiles: singleFile(`// 数値を const の変数に入れる


// その変数が正のときだけ if で「positive」 を console.log で出力する

`),
  tests: [
    {
      name: "stdout が positive になる",
      expectedStdout: "positive",
    },
  ],
  hints: [
    "`if (value > 0) { console.log(\"positive\"); }` の形で書きます。",
    "中括弧の中に「条件が真のときに実行する処理」 を入れます。",
    "解答例:\n```js\nconst value = 5;\nif (value > 0) {\n  console.log(\"positive\");\n}\n```",
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
  solution: `const value = 5;
if (value > 0) {
  console.log("positive");
}
`,
  badSolutions: [
    {
      code: `console.log("positive");
`,
      description: "if を使わず文字列を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "if...else", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/if...else", pageTitle: "if...else" },
  ],
};
