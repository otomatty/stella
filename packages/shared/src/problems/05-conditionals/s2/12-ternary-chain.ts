import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05TernaryChain: Assignment = {
  id: "S2-Ch05-12-ternary-chain",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 12,
  title: "三項を 2 段で並べる",
  newConcept: "三項演算子は連結して書けるが、 深くしすぎない",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const n = 0;\` に対して、 以下を三項演算子の **2 段連結** で出力してください。

- \`n > 0\` → \`"+"\`
- \`n < 0\` → \`"-"\`
- それ以外 → \`"0"\`

## 期待する出力

\`\`\`
0
\`\`\`

## ポイント

- \`n > 0 ? "+" : n < 0 ? "-" : "0"\` のように **連結** できますが、 3 段以上ネストすると読みにくくなるので、 通常は 2 段までに留めます。
- それ以上は \`if/else if\` を使う方が読みやすいです。
`,
  starterFiles: singleFile(`// 数値を const の変数に入れる


// 三項演算子をネストして 3 通りに分岐させ、 結果の文字列を別の const の変数に入れる


// 結果の変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 0 になる",
      expectedStdout: "0",
    },
  ],
  hints: [
    "三項を 2 段で書きます: `n > 0 ? \"+\" : n < 0 ? \"-\" : \"0\"`。",
    "結果を変数に入れて `console.log` に渡します。",
    "解答例:\n```js\nconst n = 0;\nconst sign = n > 0 ? \"+\" : n < 0 ? \"-\" : \"0\";\nconsole.log(sign);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ConditionalExpression", label: "三項演算子を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const n = 0;
const sign = n > 0 ? "+" : n < 0 ? "-" : "0";
console.log(sign);
`,
  badSolutions: [
    {
      code: `console.log("0");
`,
      description: "三項演算子を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "条件 (三項) 演算子", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Conditional_operator", pageTitle: "条件 (三項) 演算子" },
  ],
};
