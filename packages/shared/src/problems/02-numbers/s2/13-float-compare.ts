import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_TEXT_FORMATTING =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Text_formatting";

export const s2Ch02FloatCompare: Assignment = {
  id: "S2-Ch02-133-float-compare",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 13,
  title: "小数の誤差で比較が外れるのを直す",
  newConcept: "0.1 + 0.2 は 0.3 にならないので、丸めてから比較する",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 期待どおりに動きません。 何が起きているかを確かめたうえで、 \`true\` が表示されるように直してください。

\`\`\`ts
const price = 0.1;
const cost = 0.2;
const total = price + cost;

console.log(total === 0.3); // 期待: true
\`\`\`

\`price\` と \`cost\` の値は変えずに、 \`total\` の求め方を直します。

## 期待する出力

\`\`\`
true
\`\`\`

## ポイント

- \`0.1 + 0.2\` は \`0.30000000000000004\` になるため、 \`=== 0.3\` が \`false\` になります。 コンピューターの小数の持ち方による誤差です。
- いったん 10 倍して整数にしてから丸め、 最後に 10 で割ることで期待どおりの値になります。
- 実務ではそもそも小数で比較せず、 金額なら「円」の整数のまま計算する設計にします。
`,
  starterFiles: singleFile(
    `// total の求め方を直して、 true が表示されるようにしてください
const price = 0.1;
const cost = 0.2;
const total = price + cost;

console.log(total === 0.3);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "比較結果が true になる",
      expectedStdout: "true",
    },
  ],
  hints: [
    "まず `console.log(price + cost);` を書いて、 実際の値を目で見てみてください。 `0.3` にはなっていません。",
    "10 倍して `Math.round` で整数にしてから、 10 で割ると誤差が落ちます。",
    "解答例:\n```ts\nconst price = 0.1;\nconst cost = 0.2;\nconst total = Math.round((price + cost) * 10) / 10;\n\nconsole.log(total === 0.3);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [{ kind: "method", name: "round", label: "Math.round を使う" }],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const price = 0.1;
const cost = 0.2;
const total = Math.round((price + cost) * 10) / 10;

console.log(total === 0.3);
`,
  badSolutions: [
    {
      code: `const price = 0.1;
const cost = 0.2;
const total = price + cost;

console.log(total === 0.3);
`,
      description: "元のまま提出しており、 誤差のため false が表示される",
    },
  ],
  mdnSections: [
    { heading: "比較演算子" },
    {
      heading: "Math オブジェクト",
      pageUrl: MDN_TEXT_FORMATTING,
      pageTitle: "数値と文字列",
    },
  ],
};
