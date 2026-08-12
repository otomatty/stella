import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07SpreadCallFix: Assignment = {
  id: "S3-Ch07-433-spread-call-fix",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 11,
  title: "配列を残余引数の関数に渡す",
  newConcept: "呼び出し側の ... は「広げる」(スプレッド構文)",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

次のコードはエラーになります。 **関数側は変えずに、 呼び出し側だけ** を直してください。

\`\`\`ts
const sum = (...prices: number[]): number => {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  return total;
};

const prices = [480, 500, 450];
const total = sum(prices);
\`\`\`

\`sum(prices)\` と書くと、 **配列そのもの** が 1 つ目の引数として渡されます。 \`sum\` は数値を並べて受け取る関数なので、「Argument of type 'number[]' is not assignable to parameter of type 'number'.」というエラーになります。

## 期待する挙動

- \`sum\` は渡された数値をすべて足した合計を返します。 1 つも渡されなければ \`0\` を返します。
- \`total\` には \`prices\` の 3 件の合計が入ります。

## ポイント

- 呼び出し側でドット 3 つを付けると、 配列が \`480, 500, 450\` と並べて書いたのと同じ形に **広がります**。
- 同じ \`...\` でも、 **定義側なら「集める」、 呼び出し側なら「広げる」** です。
- 関数側を「配列を 1 つ受け取る形」に書き換えてはいけません。 その場合、 数値を並べて呼び出せなくなります。
`,
  starterFiles: singleFile(
    `// 下のコードはエラーになります。 関数側は変えずに、 呼び出し側だけを直してください。

const sum = (...prices: number[]): number => {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  return total;
};

const prices = [480, 500, 450];
const total = sum(prices);
`,
    "main.ts",
  ),
  entryPoints: ["sum", "total"],
  demoCall: `console.log(total);`,
  tests: [
    { name: "total は 1430 になる", code: `total === 1430` },
    {
      name: "数値を並べて渡しても合計できる",
      code: `sum(1, 2, 3) === 6`,
    },
    { name: "1 つも渡さなければ 0", code: `sum() === 0` },
    {
      name: "別の配列を広げても合計できる",
      code: `sum(...[10, 20, 30, 40]) === 100`,
    },
  ],
  hints: [
    "エラーの文面は「number[] を number の引数に渡そうとしている」と言っています。 渡しているのは配列 1 つ、 求められているのは数値の並びです。",
    "配列を「並べて書いたのと同じ形」にする書き方が呼び出し側にあります。 直すのは 1 行、 足すのは記号 3 文字だけです。",
    "解答例:\n```ts\nconst prices = [480, 500, 450];\nconst total = sum(...prices);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const sum = (...prices: number[]): number => {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  return total;
};

const prices = [480, 500, 450];
const total = sum(...prices);
`,
  badSolutions: [
    {
      code: `const sum = (prices: number[]): number => {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  return total;
};

const prices = [480, 500, 450];
const total = sum(prices);
`,
      description:
        "呼び出し側ではなく関数側を「配列を 1 つ受け取る形」に変えてしまい、 数値を並べて渡す呼び出しが動かなくなる",
    },
  ],
  mdnSections: [{ heading: "残余引数" }, { heading: "関数の呼び出し" }],
};
