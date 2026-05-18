import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02PercentOnesPlace: Assignment = {
  id: "S2-Ch02-12-percent-ones-place",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 12,
  title: "% で 1 の位を取り出す",
  newConcept: "% (剰余) で「下 N 桁」 を取り出す定石",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`12345\` を \`10\` で割った余りを出力すれば「1 の位」 が取れます。 \`%\` を使って **1 の位 (5)** を出力してください。

## 期待する出力

\`\`\`
5
\`\`\`

## ポイント

- \`n % 10\` で \`n\` の **1 の位** が取り出せます。
- 同様に \`n % 100\` なら **下 2 桁**、 \`Math.floor(n / 10) % 10\` で **10 の位** が取れます。
`,
  starterFiles: singleFile(`// 説明文の数値を const の変数に入れる


// その変数を 10 で割った余り (% 演算子) を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 5 になる",
      expectedStdout: "5",
    },
  ],
  hints: [
    "`%` は剰余 (割った余り) を返す演算子です。",
    "`12345 % 10` は `5`。 1 の位が取り出せます。",
    "解答例:\n```js\nconst n = 12345;\nconsole.log(n % 10);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "%" },
          label: "% で 1 の位を計算した結果を出力する",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const n = 12345;
console.log(n % 10);
`,
  badSolutions: [
    {
      code: `console.log(5);
`,
      description: "% を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "剰余 (%)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Remainder", pageTitle: "剰余 (%)" },
  ],
};
