import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_GRAMMAR =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types";

export const s2Ch03StringPlusNumber: Assignment = {
  id: "S2-Ch03-143-string-plus-number",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 13,
  title: "文字列のまま足し算していたのを直す",
  newConcept: "値を最初から数値として持てば、+ は足し算として働く",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 合計金額として \`350\` を表示したいのに、 そうなりません。 エラーは出ません。 何が起きているかを確かめて、 \`350\` が表示されるよう直してください。

\`\`\`ts
const priceFromForm = "300";
const shipping = 50;
const total = priceFromForm + shipping;

console.log(total); // 期待: 350
\`\`\`

## 期待する出力

\`\`\`
350
\`\`\`

## ポイント

- \`"300"\` はクォートで囲まれているので \`string\` 型です。 そのため \`+\` が足し算ではなく連結として働き、 \`"30050"\` になっていました。
- 根本的な直し方は、 値を最初から数値として持つことです。
- フォームから文字列で受け取る場合は、 数値に変換してから計算します (変換の方法は後のモジュールで扱います)。
`,
  starterFiles: singleFile(
    `// エラーは出ませんが 350 になりません。 350 が表示されるよう直してください
const priceFromForm = "300";
const shipping = 50;
const total = priceFromForm + shipping;

console.log(total);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "合計の 350 が出力される",
      expectedStdout: "350",
    },
  ],
  hints: [
    "まず今の出力を見てください。 `30050` になっているはずです。 これは連結の結果です。",
    "`\"300\"` のクォートを外して、 最初から数値として持たせます。",
    "解答例:\n```ts\nconst priceFromForm = 300;\nconst shipping = 50;\nconst total = priceFromForm + shipping;\n\nconsole.log(total);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const priceFromForm = 300;
const shipping = 50;
const total = priceFromForm + shipping;

console.log(total);
`,
  badSolutions: [
    {
      code: `const priceFromForm = "300";
const shipping = 50;
const total = priceFromForm + shipping;

console.log(total);
`,
      description: "元のままなので連結が起き、 30050 が表示される",
    },
  ],
  mdnSections: [
    { heading: "文字列" },
    {
      heading: "数値と '+' 演算子",
      anchor: "数値と_演算子",
      pageUrl: MDN_GRAMMAR,
      pageTitle: "文法とデータ型",
    },
  ],
};
