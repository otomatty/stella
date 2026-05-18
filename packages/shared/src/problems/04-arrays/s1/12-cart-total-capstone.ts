import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04CartTotalCapstone: Assignment = {
  id: "S1-Ch04-12-cart-total-capstone",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 12,
  title: "[チャレンジ] 商品リストの合計額を出す",
  newConcept: "S1 で習った変数 / 配列 / 数値演算 / テンプレートリテラルを統合する",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  isCapstone: true,
  description: `## やること

3 つの商品の価格を配列で持ち、 添字で取り出して **合計額** を計算する **チャレンジ問題** です。

- 配列名: \`prices\`
- 中身: \`[100, 250, 380]\`

S1 ではループをまだ使わないので、 \`prices[0] + prices[1] + prices[2]\` のように **添字で 1 つずつ取り出して** 合計します。

合計額を \`total\` に入れ、 テンプレートリテラルで \`"合計: 730 円"\` の形に組み立てて出力してください。

## 期待する出力

\`\`\`
合計: 730 円
\`\`\`

## ポイント

- 合計は \`prices[0] + prices[1] + prices[2]\` を const \`total\` に入れます。
- 出力はテンプレートリテラルで \`\` \`合計: \${total} 円\` \`\` の形にします。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// 添字 0 / 1 / 2 の要素を + で足し算した結果を、 別の const の変数に入れる
// (ループはまだ使わず、 添字を直接並べる)


// テンプレートリテラルで「合計: ... 円」 形式の文字列を組み立て、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が 合計: 730 円 になる",
      expectedStdout: "合計: 730 円",
    },
  ],
  hints: [
    "ループはまだ使わないので、 添字を 0, 1, 2 と並べて足します。",
    "`const total = prices[0] + prices[1] + prices[2];` で合計を保持し、 テンプレートで埋め込みます。",
    "解答例:\n```js\nconst prices = [100, 250, 380];\nconst total = prices[0] + prices[1] + prices[2];\nconsole.log(`合計: ${total} 円`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "prices",
          label: "const prices を宣言する",
        },
        {
          kind: "const-declaration",
          name: "total",
          label: "const total に合計を入れる",
        },
        {
          kind: "node",
          nodeType: "TemplateLiteral",
          label: "テンプレートリテラルで出力する",
        },
      ],
    },
  },
  solution: "const prices = [100, 250, 380];\nconst total = prices[0] + prices[1] + prices[2];\nconsole.log(`合計: ${total} 円`);\n",
  badSolutions: [
    {
      code: "console.log(`合計: 730 円`);\n",
      description: "計算せず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "配列要素へのアクセス" },
    { heading: "テンプレートリテラル" },
  ],
};
