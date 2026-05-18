import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07MakeMultiplier: Assignment = {
  id: "S3-Ch07-02-make-multiplier",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 2,
  title: "n 倍する関数を返す関数",
  newConcept: "関数を返す関数 (クロージャ入口)",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値 \`factor\` を受け取り、 「数値を受け取って \`factor\` 倍した値を返す関数」 を返す関数 \`makeMultiplier\` を実装してください。

\`\`\`js
const double = makeMultiplier(2);
double(3);   // → 6
double(10);  // → 20

const triple = makeMultiplier(3);
triple(5);   // → 15
\`\`\`

## ポイント

- 「関数を返す」 ので \`return\` の値が **関数** です。
- 内側の関数は外側のパラメータ \`factor\` を覚えています (これがクロージャ)。
`,
  starterFiles: singleFile(`function makeMultiplier(factor) {
  // 関数を return してください
}
`),
  entryPoints: ["makeMultiplier"],
  demoCall: `console.log(makeMultiplier(3)(5));`,
  tests: [
    { name: "makeMultiplier(2)(3) は 6", code: `makeMultiplier(2)(3) === 6` },
    { name: "makeMultiplier(3)(5) は 15", code: `makeMultiplier(3)(5) === 15` },
    { name: "makeMultiplier(10)(7) は 70", code: `makeMultiplier(10)(7) === 70` },
    { name: "makeMultiplier(0)(99) は 0", code: `makeMultiplier(0)(99) === 0` },
    {
      name: "別々のインスタンスが独立",
      code: `(() => { const d = makeMultiplier(2); const t = makeMultiplier(3); return d(4) === 8 && t(4) === 12; })()`,
    },
  ],
  hints: [
    "return function (n) { return n * factor; }; もしくは return (n) => n * factor;",
    "解答例:\n```js\nfunction makeMultiplier(factor) {\n  return function (n) {\n    return n * factor;\n  };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で関数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function makeMultiplier(factor) {
  return function (n) {
    return n * factor;
  };
}
`,
  badSolutions: [
    {
      code: `function makeMultiplier(factor) {
  return factor;
}
`,
      description: "関数ではなく factor の値を返している",
    },
    {
      code: `function makeMultiplier(factor) {
  return function (n) {
    return n;
  };
}
`,
      description: "factor を使っておらず、 n をそのまま返している",
    },
  ],
  mdnSections: [
    {
      heading: "クロージャ",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures",
      pageTitle: "クロージャ",
    },
  ],
};
