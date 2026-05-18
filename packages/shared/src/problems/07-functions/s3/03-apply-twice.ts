import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07ApplyTwice: Assignment = {
  id: "S3-Ch07-03-apply-twice",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 3,
  title: "関数を 2 回適用した結果を返す",
  newConcept: "関数を引数で受け取って呼び出す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

関数 \`fn\` と値 \`x\` を受け取り、 \`fn(fn(x))\` の結果を返す関数 \`applyTwice\` を実装してください。

\`\`\`js
applyTwice((n) => n + 1, 5);    // → 7
applyTwice((n) => n * 2, 3);    // → 12
applyTwice((s) => s + "!", "hi"); // → "hi!!"
\`\`\`

## ポイント

- 引数として渡される \`fn\` は普通の関数として呼べます (\`fn(x)\` のように)。
- \`fn(fn(x))\` を return すれば 1 行で済みます。
`,
  starterFiles: singleFile(`function applyTwice(fn, x) {
  // ここを実装してください
}
`),
  entryPoints: ["applyTwice"],
  demoCall: `console.log(applyTwice((n) => n + 1, 5));`,
  tests: [
    { name: "applyTwice(+1, 5) は 7", code: `applyTwice((n) => n + 1, 5) === 7` },
    { name: "applyTwice(*2, 3) は 12", code: `applyTwice((n) => n * 2, 3) === 12` },
    { name: 'applyTwice(append!, "hi") は "hi!!"', code: `applyTwice((s) => s + "!", "hi") === "hi!!"` },
    { name: "applyTwice(square, 2) は 16", code: `applyTwice((n) => n * n, 2) === 16` },
    { name: "applyTwice(identity, 7) は 7", code: `applyTwice((n) => n, 7) === 7` },
  ],
  hints: [
    "return fn(fn(x));",
    "解答例:\n```js\nfunction applyTwice(fn, x) {\n  return fn(fn(x));\n}\n```",
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
  solution: `function applyTwice(fn, x) {
  return fn(fn(x));
}
`,
  badSolutions: [
    {
      code: `function applyTwice(fn, x) {
  return fn(x);
}
`,
      description: "1 回しか適用していない",
    },
    {
      code: `function applyTwice(fn, x) {
  return x;
}
`,
      description: "fn を呼び出していない",
    },
  ],
  mdnSections: [
    {
      heading: "第一級関数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Functions",
      pageTitle: "関数",
    },
  ],
};
