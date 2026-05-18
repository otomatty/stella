import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02IsEven: Assignment = {
  id: "S3-Ch02-01-is-even",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 1,
  title: "偶数判定の関数を作る",
  newConcept: "剰余演算で真偽値を返す",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

整数 \`n\` を受け取り、 偶数なら \`true\`、 奇数なら \`false\` を返す関数 \`isEven\` を実装してください。

\`\`\`js
isEven(2);   // → true
isEven(3);   // → false
isEven(0);   // → true
isEven(-4);  // → true
\`\`\`

## ポイント

- \`n % 2\` が 0 なら偶数、 そうでなければ奇数です。
- \`return n % 2 === 0;\` のように比較式をそのまま return できます。
`,
  starterFiles: singleFile(`function isEven(n) {
  // ここを実装してください
}
`),
  entryPoints: ["isEven"],
  demoCall: `console.log(isEven(4), isEven(7));`,
  tests: [
    { name: "isEven(2) は true", code: `isEven(2) === true` },
    { name: "isEven(3) は false", code: `isEven(3) === false` },
    { name: "isEven(0) は true", code: `isEven(0) === true` },
    { name: "isEven(-4) は true", code: `isEven(-4) === true` },
    { name: "isEven(-5) は false", code: `isEven(-5) === false` },
  ],
  hints: [
    "`n % 2 === 0` の結果をそのまま return します。",
    "解答例:\n```js\nfunction isEven(n) {\n  return n % 2 === 0;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function isEven(n) {
  return n % 2 === 0;
}
`,
  badSolutions: [
    {
      code: `function isEven(n) {
  return true;
}
`,
      description: "常に true を返している",
    },
    {
      code: `function isEven(n) {
  return n % 2;
}
`,
      description: "真偽値ではなく数値を返している (偶数で 0、 奇数で 0 以外。 負の奇数では -1)",
    },
  ],
  mdnSections: [
    {
      heading: "剰余 (%)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Remainder",
      pageTitle: "剰余 (%)",
    },
  ],
};
