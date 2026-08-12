import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03OrderMessage: Assignment = {
  id: "S1-Ch03-141-order-message",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 14,
  title: "テンプレートリテラルで注文メッセージを組み立てる",
  newConcept: "バッククォートの中では ${変数名} で値を埋め込める",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 3 つの変数を宣言し、 テンプレートリテラルで 1 つの文を組み立てて表示してください。

- 注文番号 \`"A-1001"\`
- 商品名 \`"ブレンドコーヒー"\`
- 数量 \`2\`

## 期待する出力

\`\`\`
注文番号A-1001のご注文(ブレンドコーヒー×2)を承りました
\`\`\`

## ポイント

- テンプレートリテラルはバッククォート \`\` \` \`\` で囲み、 埋め込みたい場所に \`\${変数名}\` を書きます。
- 数値の変数もそのまま埋め込めます。 文字列に変換する必要はありません。
- かっこや \`×\` は、 そのまま文字として書けば表示されます。
`,
  starterFiles: singleFile(
    `// 注文番号


// 商品名


// 数量


// テンプレートリテラルで 1 文にまとめて表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "組み立てた 1 行が出力される",
      expectedStdout: "注文番号A-1001のご注文(ブレンドコーヒー×2)を承りました",
    },
  ],
  hints: [
    "全体をバッククォートで囲みます。 ダブルクォートでは `${ }` が働きません。",
    "`${orderId}` のように、 変数名を `${` と `}` ではさみます。",
    '解答例:\n```ts\nconst orderId = "A-1001";\nconst itemName = "ブレンドコーヒー";\nconst quantity = 2;\n\nconst message = `注文番号${orderId}のご注文(${itemName}×${quantity})を承りました`;\nconsole.log(message);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const orderId = "A-1001";
const itemName = "ブレンドコーヒー";
const quantity = 2;

const message = \`注文番号\${orderId}のご注文(\${itemName}×\${quantity})を承りました\`;
console.log(message);
`,
  badSolutions: [
    {
      code: `const orderId = "A-1001";
const itemName = "ブレンドコーヒー";
const quantity = 2;

const message = "注文番号\${orderId}のご注文(\${itemName}×\${quantity})を承りました";
console.log(message);
`,
      description:
        "ダブルクォートで囲んでいるため ${ } が働かず、 そのまま文字として表示される",
    },
  ],
  mdnSections: [{ heading: "テンプレートリテラル" }, { heading: "組み込み式" }],
};
