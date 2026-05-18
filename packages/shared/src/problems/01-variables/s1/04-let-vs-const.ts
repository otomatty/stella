import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01LetVsConst: Assignment = {
  id: "S1-Ch01-04-let-vs-const",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 4,
  title: "let と const を使い分ける",
  newConcept: "値が変わらないものは const、 変わるものは let で宣言する",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

次の 2 つの変数を **適切なキーワード** で宣言してください。

- \`taxRate\` (消費税率): \`0.1\` を入れて **後から変えない**
- \`total\` (合計): 最初は \`100\` を入れ、 後で \`200\` に書き換える

最後に \`console.log\` で \`taxRate\` と \`total\` をこの順に出力します。

## 期待する出力

\`\`\`
0.1
200
\`\`\`

## ポイント

- 値を変えない変数 → \`const\`
- 値を変える変数 → \`let\`
`,
  starterFiles: singleFile(`// 1. taxRate を 0.1 で宣言 (再代入しないので const)
// 2. total を 100 で宣言 (後で再代入するので let)
// 3. total = 200 に書き換える
// 4. taxRate と total をそれぞれ console.log で出力

`),
  tests: [
    {
      name: "stdout が 0.1 と 200 の 2 行になる",
      expectedStdout: "0.1\n200",
    },
  ],
  hints: [
    "後から値を変えない変数は `const`、 変える変数は `let` で宣言します。",
    "`taxRate` は途中で書き換えていないので `const`、 `total` は書き換えるので `let` です。",
    "解答例:\n```js\nconst taxRate = 0.1;\nlet total = 100;\ntotal = 200;\nconsole.log(taxRate);\nconsole.log(total);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "taxRate",
          label: "const taxRate を宣言する",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const taxRate = 0.1;
let total = 100;
total = 200;
console.log(taxRate);
console.log(total);
`,
  badSolutions: [
    {
      code: `let taxRate = 0.1;
let total = 100;
total = 200;
console.log(taxRate);
console.log(total);
`,
      description: "再代入しない taxRate を let で宣言している",
    },
  ],
};
