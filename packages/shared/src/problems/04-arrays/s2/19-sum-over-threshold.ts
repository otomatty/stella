import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04SumOverThreshold: Assignment = {
  id: "S2-Ch04-323-sum-over-threshold",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 19,
  title: "条件に当たった要素だけを合計する",
  newConcept: "for-of の中に if を書いて、 当たったときだけ足す",
  estimatedMinutes: 11,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 **5000 円以上の金額だけ** を合計したいものです。 \`for-of\` と条件分岐を組み合わせて完成させ、 合計を表示してください。

\`\`\`ts
const prices = [3000, 8000, 1200, 12000];
// 期待: 20000
\`\`\`

## 期待する出力

\`\`\`
20000
\`\`\`

## ポイント

- \`for-of\` のブロックの中に \`if\` を書きます。 条件に当たったときだけ足し込むので、 8000 と 12000 だけが合計されます。
- ブロックが二重になりますが、 内側の \`if\` から外側の \`total\` は見えます (「内側からは外が見える」)。
- 足し込みは \`total = total + price;\` です。 \`total = price;\` と書くと、 足すのではなく上書きになってしまいます。
`,
  starterFiles: singleFile(
    `const prices = [3000, 8000, 1200, 12000];

// 合計用の変数をループの外で用意する


// for-of で 1 件ずつ見て、 5000 以上のときだけ合計に足す


// 合計を表示する（期待: 20000）

`,
    "main.ts",
  ),
  tests: [
    {
      name: "5000 円以上だけの合計が出力される",
      expectedStdout: "20000",
    },
  ],
  hints: [
    "まず全件を合計する形を書いてから、 足し込む行を `if` で囲みます。",
    "条件は `price >= 5000` です。「以上」なので 5000 ちょうども含みます。",
    "解答例:\n```ts\nconst prices = [3000, 8000, 1200, 12000];\n\nlet total = 0;\nfor (const price of prices) {\n  if (price >= 5000) {\n    total = total + price;\n  }\n}\n\nconsole.log(total); // => 20000\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const prices = [3000, 8000, 1200, 12000];

let total = 0;
for (const price of prices) {
  if (price >= 5000) {
    total = total + price;
  }
}

console.log(total);
`,
  badSolutions: [
    {
      code: `const prices = [3000, 8000, 1200, 12000];

let total = 0;
for (const price of prices) {
  if (price >= 5000) {
    total = price;
  }
}

console.log(total);
`,
      description:
        "足し込みではなく代入になっているため、 条件に当たった最後の金額で上書きされてしまう",
    },
  ],
  mdnSections: [{ heading: "配列の反復処理" }, { heading: "配列要素の参照" }],
};
