import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07NestedCall: Assignment = {
  id: "S2-Ch07-11-nested-call",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 11,
  title: "関数の中から関数を呼ぶ",
  newConcept: "関数の組み合わせで複雑な処理を作る",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

2 つの関数を作ります:

- \`function square(n) { return n * n; }\` (n の 2 乗)
- \`function squareThenAdd(a, b) { return square(a) + square(b); }\` (それぞれを 2 乗してから足す)

\`squareThenAdd(3, 4)\` の結果を出力してください (= 9 + 16 = 25)。

## 期待する出力

\`\`\`
25
\`\`\`

## ポイント

- 関数の中から **別の関数** を呼べます。 これを組み合わせて複雑な処理を作ります。
- 「小さい関数 × 組み合わせ」 が関数型の基本です。
- \`squareThenAdd\` の中で \`a * a + b * b\` のように式を直書きすると、 \`square\` を再利用していないので **関数合成の学習意図から外れます**。 必ず \`square(a) + square(b)\` の形にしてください。
`,
  starterFiles: singleFile(`// 引数を 2 乗して return する function 文の関数を 1 つ宣言する


// もう 1 つの function 文の関数を宣言し、 中で上の関数を 2 回呼び出して結果を + で足し合わせて return する


// 後者の関数に説明文の 2 つの値を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 25 になる",
      expectedStdout: "25",
    },
  ],
  hints: [
    "`function square(n) { return n * n; }` を先に作ります。",
    "`squareThenAdd` の中で `square(a) + square(b)` を return します。",
    "解答例:\n```js\nfunction square(n) {\n  return n * n;\n}\nfunction squareThenAdd(a, b) {\n  return square(a) + square(b);\n}\nconsole.log(squareThenAdd(3, 4));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 25 }, label: "計算せず答えを直接書かない" },
        { kind: "console-log", argument: { kind: "string", value: "25" }, label: "文字列で答えを直接書かない" },
      ],
    },
  },
  solution: `function square(n) {
  return n * n;
}
function squareThenAdd(a, b) {
  return square(a) + square(b);
}
console.log(squareThenAdd(3, 4));
`,
  badSolutions: [
    {
      code: `console.log(25);
`,
      description: "関数を作らず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
  ],
};
