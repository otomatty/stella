import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_TEXT_FORMATTING =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Text_formatting";

export const s1Ch02CoffeeTotal: Assignment = {
  id: "S1-Ch02-131-coffee-total",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 14,
  title: "小計・消費税額・合計を計算する",
  newConcept: "税額の小数は Math.round で丸めてから合計する",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

コーヒー 1 杯 480 円を 4 杯注文したときの、 次の 3 つを計算して順に表示してください。 型注釈は付けず、 すべて型推論に任せて構いません。

- 小計 (税抜)
- 消費税額 (10 %、 \`Math.round\` で四捨五入)
- 合計 (税込)

## 期待する出力

\`\`\`
1920
192
2112
\`\`\`

## ポイント

- 単価と数量をそれぞれ変数に入れてから掛け算すると、 値を変えたときに直す場所が 1 か所で済みます。
- 税額の計算で小数が出る可能性があるため、 \`Math.round\` で整数に丸めてから合計します。
- 金額を扱うときは、 小数を長く持ち回らないのが基本です。
`,
  starterFiles: singleFile(
    `// 単価と数量


// 小計（税抜）


// 消費税額（10 %、 Math.round で四捨五入）


// 合計（税込）


// 小計・消費税額・合計を順に表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "小計・消費税額・合計が順に出力される",
      expectedStdout: "1920\n192\n2112",
    },
  ],
  hints: [
    "小計は `単価 * 数量` です。 480 円 × 4 杯を計算します。",
    "消費税額は `Math.round(小計 * 0.1)` です。 丸めてから合計に足します。",
    "解答例:\n```ts\nconst unitPrice = 480;\nconst quantity = 4;\n\nconst subtotal = unitPrice * quantity;\nconst tax = Math.round(subtotal * 0.1);\nconst total = subtotal + tax;\n\nconsole.log(subtotal);\nconsole.log(tax);\nconsole.log(total);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [{ kind: "method", name: "round", label: "Math.round を使う" }],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const unitPrice = 480;
const quantity = 4;

const subtotal = unitPrice * quantity;
const tax = Math.round(subtotal * 0.1);
const total = subtotal + tax;

console.log(subtotal);
console.log(tax);
console.log(total);
`,
  badSolutions: [
    {
      code: `const unitPrice = 480;
const quantity = 4;

const subtotal = unitPrice * quantity;
const tax = Math.round(subtotal * 1.1);
const total = subtotal + tax;

console.log(subtotal);
console.log(tax);
console.log(total);
`,
      description:
        "税率 10 % を 0.1 ではなく 1.1 と取り違えており、 税込金額を消費税額として足している",
    },
  ],
  mdnSections: [
    { heading: "算術演算子" },
    {
      heading: "Math オブジェクト",
      pageUrl: MDN_TEXT_FORMATTING,
      pageTitle: "数値と文字列",
    },
  ],
};
