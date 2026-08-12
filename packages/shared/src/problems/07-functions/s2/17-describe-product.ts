import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07DescribeProduct: Assignment = {
  id: "S2-Ch07-411-describe-product",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 17,
  title: "商品名と価格から説明文を返す関数を作る",
  newConcept: "引数を 2 つ受け取り、 テンプレートリテラルの結果を return する",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  language: "typescript",
  description: `## やること

商品名と価格を受け取り、「〇〇は△△円です」の形の文字列を **返す** 関数 \`describe\` を作ってください。 文字列はテンプレートリテラルで組み立てます。

- 1 つ目の引数: 商品名 (文字列)
- 2 つ目の引数: 価格 (数値)

\`\`\`ts
describe("コーヒー", 480); // → "コーヒーは480円です"
\`\`\`

## 期待する挙動

- 商品名と価格をそのまま並べた文字列を返します。 価格のうしろには \`円です\` が付きます。
- 表示するのではなく **返す** こと。 呼び出し側が結果を受け取れる必要があります。
- 価格が \`0\` でも同じ形の文字列を返します。

## ポイント

- 引数が 2 つあるときはカンマで区切って並べます。 それぞれに型注釈が必要です。
- 戻り値は文字列なので \`: string\` と書きます。
- \`console.log\` は画面に表示するだけで、 呼び出し元に値を渡しません。 値を渡すのは \`return\` です。
`,
  starterFiles: singleFile(
    `// 商品名 (文字列) と価格 (数値) を受け取る関数 describe を作る
// テンプレートリテラルで「商品名は価格円です」の文字列を組み立てて return する

`,
    "main.ts",
  ),
  entryPoints: ["describe"],
  demoCall: `console.log(describe("コーヒー", 480));`,
  tests: [
    {
      name: 'describe("コーヒー", 480) は "コーヒーは480円です"',
      code: `describe("コーヒー", 480) === "コーヒーは480円です"`,
    },
    {
      name: 'describe("紅茶", 500) は "紅茶は500円です"',
      code: `describe("紅茶", 500) === "紅茶は500円です"`,
    },
    {
      name: "価格が 0 でも同じ形になる",
      code: `describe("試供品", 0) === "試供品は0円です"`,
    },
    {
      name: "表示ではなく return で値を返している",
      code: `typeof describe("緑茶", 450) === "string"`,
    },
  ],
  hints: [
    "引数は 2 つです。 `(name: string, price: number)` のようにカンマで区切り、 それぞれに型注釈を書きます。",
    "組み立てた文字列を `return` してください。 表示しただけでは呼び出し元は値を受け取れません。",
    '解答例:\n```ts\nfunction describe(name: string, price: number): string {\n  return `${name}は${price}円です`;\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `function describe(name: string, price: number): string {
  return \`\${name}は\${price}円です\`;
}
`,
  badSolutions: [
    {
      code: `function describe(name: string, price: number): string {
  const message = \`\${name}は\${price}円です\`;
}
`,
      description:
        "文字列を組み立てただけで return していないため、 呼び出し元は undefined を受け取る",
    },
  ],
  mdnSections: [{ heading: "関数の定義" }, { heading: "関数の呼び出し" }],
};
