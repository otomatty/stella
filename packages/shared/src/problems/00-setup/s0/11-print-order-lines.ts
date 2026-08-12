import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s0Ch00PrintOrderLines: Assignment = {
  id: "S0-Ch00-021-print-order-lines",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 11,
  title: "文字列と計算結果を順に表示する",
  newConcept: "console.log は書いた順に実行され、計算式はそのまま書ける",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 3 つを \`console.log\` で表示するコードを書いてください。

- 文字列「注文を受け付けました」
- \`1200 + 300\` の計算結果
- 文字列「ありがとうございました」

## 期待する出力

\`\`\`
注文を受け付けました
1500
ありがとうございました
\`\`\`

## ポイント

- \`console.log\` は書いた順に実行されます。
- 文字列は引用符で囲みます。 計算式は引用符で囲まず、 そのまま書きます。
- 引用符で囲むと計算されず、 書いた文字がそのまま表示されてしまいます。
`,
  starterFiles: singleFile(
    `// 1) 「注文を受け付けました」 を表示する


// 2) 1200 + 300 の計算結果を表示する


// 3) 「ありがとうございました」 を表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "3 行が順に出力される",
      expectedStdout: "注文を受け付けました\n1500\nありがとうございました",
    },
  ],
  hints: [
    "文字列を表示するときは `console.log(\"...\")` のように引用符で囲みます。",
    "計算式は引用符で囲まずに `console.log(1200 + 300);` と書きます。 かっこの中が先に計算されます。",
    '解答例:\n```ts\nconsole.log("注文を受け付けました");\nconsole.log(1200 + 300);\nconsole.log("ありがとうございました");\n```',
  ],
  solution: `console.log("注文を受け付けました");
console.log(1200 + 300);
console.log("ありがとうございました");
`,
  badSolutions: [
    {
      code: `console.log("注文を受け付けました");
console.log("1200 + 300");
console.log("ありがとうございました");
`,
      description: "計算式まで引用符で囲んでしまい、 計算されずそのまま表示される",
    },
  ],
  mdnSections: [{ heading: "JavaScript を入力して実行" }],
};
