import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09PipelineCapstone: Assignment = {
  id: "S3-Ch09-08-pipeline-capstone",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 8,
  title: "[卒業課題] 注文配列から合計金額を計算するパイプライン",
  newConcept: "filter → map → reduce を連鎖させた典型パイプライン",
  estimatedMinutes: 25,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

\`{ price: number, quantity: number, isPaid: boolean }\` の注文オブジェクト配列 \`orders\` を受け取り、 以下のパイプラインで合計金額を返す関数 \`totalPaidAmount\` を実装してください。

1. **filter**: \`isPaid === true\` の注文だけ残す
2. **map**: 各注文を \`price * quantity\` の数値に変換する
3. **reduce**: 合計を取る (初期値 0)

\`\`\`js
totalPaidAmount([
  { price: 100, quantity: 2, isPaid: true },   // 200
  { price: 50,  quantity: 3, isPaid: false },  // 除外
  { price: 200, quantity: 1, isPaid: true },   // 200
]);
// → 400

totalPaidAmount([]);   // → 0

totalPaidAmount([{ price: 100, quantity: 1, isPaid: false }]);   // → 0
\`\`\`

## ポイント

- これは **S3 卒業課題** のひとつ。 **filter → map → reduce** の代表的な 3 段パイプライン。
- メソッドチェーンで 1 行に書ける: \`orders.filter(...).map(...).reduce(...)\`
- AST で **3 つすべて** の使用を必須にしているので、 for ループでは通りません。
`,
  starterFiles: singleFile(`function totalPaidAmount(orders) {
  // filter → map → reduce のパイプラインで実装してください
}
`),
  entryPoints: ["totalPaidAmount"],
  demoCall: `console.log(totalPaidAmount([{ price: 100, quantity: 2, isPaid: true }, { price: 200, quantity: 1, isPaid: true }]));`,
  tests: [
    {
      name: "支払済 2 件で 400",
      code: `totalPaidAmount([
        { price: 100, quantity: 2, isPaid: true },
        { price: 50,  quantity: 3, isPaid: false },
        { price: 200, quantity: 1, isPaid: true },
      ]) === 400`,
    },
    {
      name: "空配列で 0",
      code: `totalPaidAmount([]) === 0`,
    },
    {
      name: "全て未払いで 0",
      code: `totalPaidAmount([{ price: 100, quantity: 1, isPaid: false }]) === 0`,
    },
    {
      name: "1 件だけ支払済",
      code: `totalPaidAmount([{ price: 99, quantity: 4, isPaid: true }]) === 396`,
    },
    {
      name: "isPaid=false は完全に除外",
      code: `totalPaidAmount([
        { price: 1, quantity: 1, isPaid: true },
        { price: 100, quantity: 100, isPaid: false },
        { price: 2, quantity: 1, isPaid: true },
      ]) === 3`,
    },
  ],
  hints: [
    "orders.filter((o) => o.isPaid).map((o) => o.price * o.quantity).reduce((a, b) => a + b, 0);",
    "解答例:\n```js\nfunction totalPaidAmount(orders) {\n  return orders\n    .filter((o) => o.isPaid)\n    .map((o) => o.price * o.quantity)\n    .reduce((acc, n) => acc + n, 0);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
        { kind: "method", name: "filter", label: "Array.filter を使う" },
        { kind: "method", name: "map", label: "Array.map を使う" },
        { kind: "method", name: "reduce", label: "Array.reduce を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function totalPaidAmount(orders) {
  return orders
    .filter((o) => o.isPaid)
    .map((o) => o.price * o.quantity)
    .reduce((acc, n) => acc + n, 0);
}
`,
  badSolutions: [
    {
      code: `function totalPaidAmount(orders) {
  let total = 0;
  for (const o of orders) {
    if (o.isPaid) total += o.price * o.quantity;
  }
  return total;
}
`,
      description: "for ループで書いていて filter/map/reduce のいずれも使っていない",
    },
    {
      code: `function totalPaidAmount(orders) {
  return orders.map((o) => o.price * o.quantity).reduce((a, b) => a + b, 0);
}
`,
      description: "filter していないので未払い注文も合算されている",
    },
  ],
  mdnSections: [
    {
      heading: "メソッドチェーン",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array",
      pageTitle: "Array",
    },
  ],
};
