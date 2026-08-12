import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07FixCalcDiscount: Assignment = {
  id: "S3-Ch07-413-fix-calc-discount",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 9,
  title: "壊れた割引計算の関数を直す",
  newConcept: "型注釈・return・引数の個数を通しで点検する",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

次のコードには **3 か所** 間違いがあります。 すべて直してください。

\`\`\`ts
function calcDiscount(price, rate: number): number {
  const discounted = price * (1 - rate);
}

const result = calcDiscount(1000);
\`\`\`

間違いは次の 3 つです。

1. 引数 \`price\` に型注釈がない
2. 戻り値の型を \`number\` と宣言しているのに、 何も返していない
3. 引数を 2 つ取る関数なのに、 呼び出しで 1 つしか渡していない

3 つ目は **割引率 20% (\`0.2\`)** を渡して直してください。

## 期待する挙動

- \`calcDiscount\` は「価格 × (1 − 割引率)」の結果を数値で返します。
- \`result\` には \`calcDiscount(1000, 0.2)\` の結果が入ります。

## ポイント

- 引数には初期値がないので、 コンパイラーは型を推論できません。 だから引数の型注釈は必ず書きます。
- 関数の中で計算しただけでは、 呼び出し元は結果を受け取れません。 渡すには \`return\` が要ります。
- TypeScript は引数の **個数** も検査します。 足りないと「Expected 2 arguments, but got 1.」というエラーになります。
`,
  starterFiles: singleFile(
    `// 下のコードには 3 か所間違いがあります。 説明文の 1〜3 をすべて直してください。

function calcDiscount(price, rate: number): number {
  const discounted = price * (1 - rate);
}

const result = calcDiscount(1000);
`,
    "main.ts",
  ),
  entryPoints: ["calcDiscount", "result"],
  demoCall: `console.log(result);`,
  tests: [
    { name: "result は 800 になる", code: `result === 800` },
    {
      name: "calcDiscount(500, 0.5) は 250",
      code: `calcDiscount(500, 0.5) === 250`,
    },
    {
      name: "割引率 0 なら価格がそのまま返る",
      code: `calcDiscount(1000, 0) === 1000`,
    },
    {
      name: "返ってくる値は数値",
      code: `typeof calcDiscount(2400, 0.25) === "number"`,
    },
  ],
  hints: [
    "まず関数の宣言部分を見てください。 2 つある引数のうち、 片方だけ型が書かれていません。",
    "次に関数の中を見てください。 計算した値を呼び出し元に渡す 1 行が抜けています。 最後に呼び出し行の引数の数を数えてください。",
    "解答例:\n```ts\nfunction calcDiscount(price: number, rate: number): number {\n  const discounted = price * (1 - rate);\n  return discounted;\n}\n\nconst result = calcDiscount(1000, 0.2);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `function calcDiscount(price: number, rate: number): number {
  const discounted = price * (1 - rate);
  return discounted;
}

const result = calcDiscount(1000, 0.2);
`,
  badSolutions: [
    {
      code: `function calcDiscount(price: number, rate: number): number {
  const discounted = price * (1 - rate);
  return discounted;
}

const result = calcDiscount(1000);
`,
      description:
        "関数の中は直したが呼び出し側の引数が 1 つのままなので、 rate が undefined になり result が NaN になる",
    },
  ],
  mdnSections: [{ heading: "関数の引数" }, { heading: "関数の呼び出し" }],
};
