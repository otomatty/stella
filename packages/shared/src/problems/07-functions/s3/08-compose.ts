import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07Compose: Assignment = {
  id: "S3-Ch07-08-compose",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 8,
  title: "関数合成 (f ∘ g) を返す",
  newConcept: "2 つの関数を順に適用する関数を返す",
  estimatedMinutes: 12,
  difficulty: 3,
  testKind: "function",
  description: `## やること

関数 \`f\` と \`g\` を受け取り、 「引数 \`x\` を取って \`f(g(x))\` を返す関数」 を返す関数 \`compose\` を実装してください。

\`\`\`js
const double = (n) => n * 2;
const plusOne = (n) => n + 1;
const fn = compose(double, plusOne);  // double(plusOne(x))
fn(3);   // → 8   (plusOne(3)=4, double(4)=8)
fn(0);   // → 2

const toUp = (s) => s.toUpperCase();
const exclaim = (s) => s + "!";
compose(exclaim, toUp)("hi");  // → "HI!"
\`\`\`

## ポイント

- 順序に注意。 \`compose(f, g)(x)\` は \`f(g(x))\` で、 **g が先** に呼ばれます。
- \`return (x) => f(g(x));\`
`,
  starterFiles: singleFile(`function compose(f, g) {
  // 合成関数を return してください
}
`),
  entryPoints: ["compose"],
  demoCall: `console.log(compose((n) => n * 2, (n) => n + 1)(3));`,
  tests: [
    {
      name: "compose(double, plusOne)(3) は 8",
      code: `compose((n) => n * 2, (n) => n + 1)(3) === 8`,
    },
    {
      name: "compose(double, plusOne)(0) は 2",
      code: `compose((n) => n * 2, (n) => n + 1)(0) === 2`,
    },
    {
      name: 'compose(exclaim, toUp)("hi") は "HI!"',
      code: `compose((s) => s + "!", (s) => s.toUpperCase())("hi") === "HI!"`,
    },
    {
      name: "compose(square, plus5)(2) は 49",
      code: `compose((n) => n * n, (n) => n + 5)(2) === 49`,
    },
  ],
  hints: [
    "return (x) => f(g(x));",
    "解答例:\n```js\nfunction compose(f, g) {\n  return (x) => f(g(x));\n}\n```",
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
  solution: `function compose(f, g) {
  return (x) => f(g(x));
}
`,
  badSolutions: [
    {
      code: `function compose(f, g) {
  return (x) => g(f(x));
}
`,
      description: "順序が逆 (g(f(x)) になっている)",
    },
    {
      code: `function compose(f, g) {
  return f;
}
`,
      description: "g を使わず f だけを返している",
    },
  ],
  mdnSections: [
    {
      heading: "アロー関数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Arrow_functions",
      pageTitle: "アロー関数式",
    },
  ],
};
