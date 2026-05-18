import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch07Pipe: Assignment = {
  id: "S4-Ch07-03-pipe",
  stage: "S4",
  chapterId: "Ch07",
  sequence: 3,
  title: "pipe: 関数を任意個数で左から順に適用する",
  newConcept: "残余引数で受けた関数列を reduce で順番に適用する可変長合成",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

任意個数の 1 引数関数 \`fns\` を受け取り、 「値 \`x\` を取って \`fns\` を **左から順に** 適用した結果を返す」 関数を返す関数 \`pipe\` を実装してください。 関数を 1 つも渡さなかった場合は、 受け取った値をそのまま返してください。

\`\`\`js
const double = (n) => n * 2;
const plusOne = (n) => n + 1;
const negate = (n) => -n;

pipe(plusOne, double)(3);         // → 8     ((3 + 1) * 2)
pipe(double, plusOne)(3);         // → 7     ((3 * 2) + 1)
pipe(plusOne, double, negate)(3); // → -8    (((3 + 1) * 2) * -1)
pipe()(42);                       // → 42    (関数なしならそのまま)
\`\`\`

## ポイント

- 関数列は **残余引数** \`(...fns)\` で受け取ります。
- \`fns.reduce((acc, f) => f(acc), x)\` で **左から順に** 適用できます。
- S3 の \`compose(f, g)\` は \`f(g(x))\` (右→左)。 \`pipe\` は逆で **左→右** に流れていきます。
`,
  starterFiles: singleFile(`function pipe() {
  // 残余引数で関数列を受けて、 値を左から右に流す関数を return してください
}
`),
  entryPoints: ["pipe"],
  demoCall: `console.log(pipe((n) => n + 1, (n) => n * 2)(3));`,
  tests: [
    {
      name: "pipe(plusOne, double)(3) は 8",
      code: `pipe((n) => n + 1, (n) => n * 2)(3) === 8`,
    },
    {
      name: "pipe(double, plusOne)(3) は 7 (順序が compose と逆)",
      code: `pipe((n) => n * 2, (n) => n + 1)(3) === 7`,
    },
    {
      name: "3 つ以上の関数も左から順に適用される",
      code: `pipe((n) => n + 1, (n) => n * 2, (n) => -n)(3) === -8`,
    },
    {
      name: "関数 1 つでもそのまま動く",
      code: `pipe((n) => n * 10)(5) === 50`,
    },
    {
      name: "関数 0 個なら値をそのまま返す",
      code: `pipe()(42) === 42`,
    },
    {
      name: "文字列にも使える",
      code: `pipe((s) => s.toUpperCase(), (s) => s + "!")("hi") === "HI!"`,
    },
  ],
  hints: [
    "`function pipe(...fns) { return (x) => fns.reduce((acc, f) => f(acc), x); }`",
    "解答例:\n```js\nfunction pipe(...fns) {\n  return (x) => fns.reduce((acc, f) => f(acc), x);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で関数を返す" },
        { kind: "node", nodeType: "RestElement", label: "...fns (残余引数) で関数列を受ける" },
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数で内側の関数を作る" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function pipe(...fns) {
  return (x) => fns.reduce((acc, f) => f(acc), x);
}
`,
  badSolutions: [
    {
      code: `function pipe(...fns) {
  return (x) => fns.reduceRight((acc, f) => f(acc), x);
}
`,
      description: "reduceRight にしているため右から左に適用されており順序が逆 (テスト失敗)",
    },
    {
      code: `function pipe(f, g) {
  return (x) => g(f(x));
}
`,
      description: "残余引数を使っておらず 2 個固定でしか動かない (AST + テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "残余引数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/rest_parameters",
      pageTitle: "残余引数",
    },
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
  ],
};
