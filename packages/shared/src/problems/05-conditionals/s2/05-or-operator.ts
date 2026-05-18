import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05OrOperator: Assignment = {
  id: "S2-Ch05-05-or-operator",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 5,
  title: "|| で複数条件を OR 連結する",
  newConcept: "|| はどちらか真なら真になる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const isWeekend = false;\` と \`const isHoliday = true;\` の **どちらか** が真なら \`"休み"\` を出力してください。

## 期待する出力

\`\`\`
休み
\`\`\`

## ポイント

- \`A || B\` は **A か B のどちらかが真** なら真になります (両方真でも OK)。
- \`if (isWeekend || isHoliday)\` のように使います。
`,
  starterFiles: singleFile(`// 2 つの boolean 値を、 それぞれ const の変数に入れる


// || で 2 つの条件を OR 結合した if で文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 休み になる",
      expectedStdout: "休み",
    },
  ],
  hints: [
    "`isWeekend || isHoliday` で OR 条件にできます。",
    "`if (条件) { ... }` の中で出力します。",
    "解答例:\n```js\nconst isWeekend = false;\nconst isHoliday = true;\nif (isWeekend || isHoliday) {\n  console.log(\"休み\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "LogicalExpression", label: "|| で複数条件をつなぐ" },
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const isWeekend = false;
const isHoliday = true;
if (isWeekend || isHoliday) {
  console.log("休み");
}
`,
  badSolutions: [
    {
      code: `console.log("休み");
`,
      description: "条件式を書かず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "論理 OR (||)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_OR", pageTitle: "論理 OR (||)" },
  ],
};
