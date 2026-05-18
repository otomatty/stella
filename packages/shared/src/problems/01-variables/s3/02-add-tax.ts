import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch01AddTax: Assignment = {
  id: "S3-Ch01-02-add-tax",
  stage: "S3",
  chapterId: "Ch01",
  sequence: 2,
  title: "税込価格を計算して返す関数",
  newConcept: "計算結果を const で名前を付けてから返す",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

税抜価格 \`price\` を受け取り、 **消費税 10%** を加えた税込価格を整数で返す関数 \`addTax\` を実装してください。 端数は \`Math.round\` で四捨五入します。

\`\`\`js
addTax(100);  // → 110
addTax(250);  // → 275
addTax(0);    // → 0
\`\`\`

## ポイント

- 計算結果に \`const total = ...\` のように **意味のある名前** を付けてから return すると読みやすくなります。
- \`price * 1.1\` は浮動小数点誤差で \`110.00000000000001\` のような値になるため、 \`Math.round\` で整数に丸めます。
`,
  starterFiles: singleFile(`function addTax(price) {
  // ここを実装してください
}
`),
  entryPoints: ["addTax"],
  demoCall: `console.log(addTax(100));`,
  tests: [
    { name: "addTax(100) は 110", code: `addTax(100) === 110` },
    { name: "addTax(250) は 275", code: `addTax(250) === 275` },
    { name: "addTax(0) は 0", code: `addTax(0) === 0` },
    { name: "addTax(1000) は 1100", code: `addTax(1000) === 1100` },
  ],
  hints: [
    "1.1 を掛けると税込価格になります (`price * 1.1`)。",
    "`Math.round(price * 1.1)` で整数に丸めて返します。",
    "解答例:\n```js\nfunction addTax(price) {\n  const total = Math.round(price * 1.1);\n  return total;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function addTax(price) {
  const total = Math.round(price * 1.1);
  return total;
}
`,
  badSolutions: [
    {
      code: `function addTax(price) {
  return price + 0.1;
}
`,
      description: "0.1 を足してしまい税計算になっていない",
    },
    {
      code: `function addTax(price) {
  return price;
}
`,
      description: "税を加算していない",
    },
  ],
  mdnSections: [
    {
      heading: "const",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/const",
      pageTitle: "const",
    },
  ],
};
