import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_GRAMMAR =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types";

export const s0Ch00StringPlusNumber: Assignment = {
  id: "S0-Ch00-011-string-plus-number",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 9,
  title: "文字列と数値を + でつなぐと何が起きるか",
  newConcept: "+ は片方が文字列だと足し算ではなく連結として働く",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 合計金額として \`350\` を表示したいのに、 そうなりません。 **何が表示されるかを予想してから**、 同じコードを書いて実行し、 答え合わせをしてください。

\`\`\`ts
const price = "300";
const shipping = 50;
console.log(price + shipping);
\`\`\`

コードは書き換えずに、 そのままの動きを確かめるのが目的です。

## 期待する出力

\`\`\`
30050
\`\`\`

## ポイント

- \`"300"\` はダブルクォートで囲まれているため、 数値ではなく **文字列** です。
- \`+\` は相手が文字列だと、 足し算ではなく「連結」として働きます。 そのため \`"300"\` と \`50\` がつながって \`"30050"\` になります。
- エラーが出ないため、 画面を見るまで気づけません。 これが「気づくのが遅いバグ」の典型です。
`,
  starterFiles: singleFile(
    `// 何が表示されるかを予想してから、 次の 3 行を書いて実行してください
// 1) price に文字列の "300" を入れる


// 2) shipping に数値の 50 を入れる


// 3) price + shipping を console.log で表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "連結された 30050 が出力される",
      expectedStdout: "30050",
    },
  ],
  hints: [
    "`price` はクォートで囲むので文字列、 `shipping` はクォートなしなので数値です。",
    "文字列と数値を `+` でつなぐと、 数値のほうが文字列に変換されてから連結されます。",
    '解答例:\n```ts\nconst price = "300";\nconst shipping = 50;\nconsole.log(price + shipping);\n```',
  ],
  solution: `const price = "300";
const shipping = 50;
console.log(price + shipping);
`,
  badSolutions: [
    {
      code: `const price = 300;
const shipping = 50;
console.log(price + shipping);
`,
      description:
        "\"300\" のクォートを外して数値に直してしまい、 問題が示している現象を再現できていない",
    },
  ],
  mdnSections: [
    {
      heading: "数値と '+' 演算子",
      anchor: "数値と_演算子",
      pageUrl: MDN_GRAMMAR,
      pageTitle: "文法とデータ型",
    },
    {
      heading: "データ型の変換",
      pageUrl: MDN_GRAMMAR,
      pageTitle: "文法とデータ型",
    },
  ],
};
