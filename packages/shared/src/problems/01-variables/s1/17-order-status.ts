import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01OrderStatus: Assignment = {
  id: "S1-Ch01-151-order-status",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 17,
  title: "取りうる値だけを許す変数を宣言する",
  newConcept: "リテラル型を | でつなぐと、決まった値だけを許す型になる",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

注文の状態を表す変数 \`orderStatus\` を宣言してください。 取りうる値は \`"received"\` / \`"shipped"\` / \`"delivered"\` の 3 つだけです。 初期値は \`"received"\` にしてください。

宣言できたら、 出荷済みになった場面を想定して \`"shipped"\` に更新し、 \`console.log\` で表示してください。

## 期待する出力

\`\`\`
shipped
\`\`\`

## ポイント

- リテラル型を \`|\` でつなぐと、 決まった値だけを許す型になります。 業務上の状態遷移をそのまま型で表現できます。
- 値を更新するので \`const\` ではなく \`let\` で宣言します。
- \`string\` 型にしてしまうと、 \`"shiped"\` のようなタイポも通ってしまいます。 3 つの値だけを並べておくと、 実行前に弾いてもらえます。
`,
  starterFiles: singleFile(
    `// received / shipped / delivered の 3 つだけを許す型で宣言し、 初期値は received


// shipped に更新する


// console.log で表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "更新後の shipped が出力される",
      expectedStdout: "shipped",
    },
  ],
  hints: [
    "型のところに、 許したい値をクォート付きで `|` でつないで並べます。",
    "書き方は `let orderStatus: \"received\" | \"shipped\" | \"delivered\" = \"received\";` です。",
    '解答例:\n```ts\nlet orderStatus: "received" | "shipped" | "delivered" = "received";\norderStatus = "shipped";\nconsole.log(orderStatus);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `let orderStatus: "received" | "shipped" | "delivered" = "received";
orderStatus = "shipped";
console.log(orderStatus);
`,
  badSolutions: [
    {
      code: `let orderStatus: "received" | "shipped" | "delivered" = "received";
orderStatus = "Shipped";
console.log(orderStatus);
`,
      description:
        "更新する値の先頭を大文字にしている（リテラル型は大文字と小文字を区別する）",
    },
  ],
  mdnSections: [{ heading: "データ型" }, { heading: "文字列リテラル" }],
};
