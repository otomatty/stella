import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07NegatePredicate: Assignment = {
  id: "S3-Ch07-07-negate-predicate",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 7,
  title: "述語 (boolean を返す関数) の真偽を反転した関数を返す",
  newConcept: "高階関数で関数を作って返す",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

\`x\` を受け取って真偽値を返す関数 \`predicate\` を引数に取り、 「同じ引数を取って **真偽値を反転** して返す新しい関数」 を返す関数 \`negatePredicate\` を実装してください。

\`\`\`js
const isPositive = (n) => n > 0;
const isNonPositive = negatePredicate(isPositive);
isNonPositive(5);   // → false
isNonPositive(-3);  // → true
isNonPositive(0);   // → true

const isEmpty = (s) => s.length === 0;
const isNotEmpty = negatePredicate(isEmpty);
isNotEmpty("");      // → false
isNotEmpty("x");     // → true
\`\`\`

## ポイント

- 関数を返す関数。 \`return (x) => !predicate(x);\` で 1 行。
`,
  starterFiles: singleFile(`function negatePredicate(predicate) {
  // 反転した関数を return してください
}
`),
  entryPoints: ["negatePredicate"],
  demoCall: `console.log(negatePredicate((n) => n > 0)(-3));`,
  tests: [
    {
      name: "isNonPositive(5) は false",
      code: `negatePredicate((n) => n > 0)(5) === false`,
    },
    {
      name: "isNonPositive(-3) は true",
      code: `negatePredicate((n) => n > 0)(-3) === true`,
    },
    {
      name: "isNonPositive(0) は true",
      code: `negatePredicate((n) => n > 0)(0) === true`,
    },
    {
      name: 'isNotEmpty("") は false',
      code: `negatePredicate((s) => s.length === 0)("") === false`,
    },
    {
      name: 'isNotEmpty("x") は true',
      code: `negatePredicate((s) => s.length === 0)("x") === true`,
    },
  ],
  hints: [
    "return (x) => !predicate(x);",
    "解答例:\n```js\nfunction negatePredicate(predicate) {\n  return (x) => !predicate(x);\n}\n```",
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
  solution: `function negatePredicate(predicate) {
  return (x) => !predicate(x);
}
`,
  badSolutions: [
    {
      code: `function negatePredicate(predicate) {
  return predicate;
}
`,
      description: "反転していない (元の関数を返している)",
    },
    {
      code: `function negatePredicate(predicate) {
  return !predicate;
}
`,
      description: "関数の真偽を取って boolean を返している (関数ではない)",
    },
  ],
  mdnSections: [
    {
      heading: "論理否定 (!)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_NOT",
      pageTitle: "論理否定 (!)",
    },
  ],
};
