import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07ArrowWithArgs: Assignment = {
  id: "S2-Ch07-04-arrow-with-args",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 4,
  title: "アロー関数で引数を取って計算する",
  newConcept: "アロー関数で引数と暗黙 return を組み合わせる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

アロー関数で 2 つの引数を受け取って積を返す関数 \`multiply\` を作り、 \`multiply(6, 7)\` の結果を出力してください。

\`\`\`js
const multiply = (a, b) => a * b;
\`\`\`

## 期待する出力

\`\`\`
42
\`\`\`

## ポイント

- 引数が 2 つ以上のときは **括弧が必須**: \`(a, b) => a * b\`
- 引数が 1 つだけなら括弧を省略できます: \`x => x * 2\`
`,
  starterFiles: singleFile(`// 2 つの引数を取るアロー関数を const の変数に入れる
// (式形式 (a, b) => 式 で、 引数同士の積をそのまま返すようにする)


// 関数に説明文の値を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 42 になる",
      expectedStdout: "42",
    },
  ],
  hints: [
    "`(a, b) => a * b` の形で関数を作ります。",
    "`multiply(6, 7)` を呼び出して結果を出力します。",
    "解答例:\n```js\nconst multiply = (a, b) => a * b;\nconsole.log(multiply(6, 7));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const multiply = (a, b) => a * b;
console.log(multiply(6, 7));
`,
  badSolutions: [
    {
      code: `console.log(42);
`,
      description: "関数を作らず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "アロー関数式", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Arrow_functions", pageTitle: "アロー関数式" },
  ],
};
