import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02NumberIsInteger: Assignment = {
  id: "S2-Ch02-11-number-isinteger",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 11,
  title: "Number.isInteger で整数判定する",
  newConcept: "Number.isInteger は値が整数なら true",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Number.isInteger(7.5)\` の結果を出力してください。

## 期待する出力

\`\`\`
false
\`\`\`

## ポイント

- \`Number.isInteger(整数)\` → \`true\`
- \`Number.isInteger(小数)\` → \`false\`
- 「人数」 や「個数」 など整数で扱うべき値の検証に使います。
`,
  starterFiles: singleFile(`// Number.isInteger に説明文の数値を渡した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が false になる",
      expectedStdout: "false",
    },
  ],
  hints: [
    "`Number.isInteger(値)` の形で呼び出します。",
    "`7.5` は小数なので結果は `false`。",
    "解答例:\n```js\nconsole.log(Number.isInteger(7.5));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "isInteger", label: "Number.isInteger を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `console.log(Number.isInteger(7.5));
`,
  badSolutions: [
    {
      code: `console.log(false);
`,
      description: "Number.isInteger を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Number.isInteger()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger", pageTitle: "Number.isInteger()" },
  ],
};
