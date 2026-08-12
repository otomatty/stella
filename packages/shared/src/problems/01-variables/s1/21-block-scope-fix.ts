import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01BlockScopeFix: Assignment = {
  id: "S1-Ch01-211-block-scope-fix",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 21,
  title: "ブロックの外から見えない変数を直す",
  newConcept: "ブロックの中で宣言した変数は、 ブロックの外からは見えない",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 最後の行でエラーになります。

\`\`\`ts
{
  const orderId = "A-1001";
}
console.log(orderId);
\`\`\`

\`orderId\` はブロック (中かっこ \`{ }\` で囲まれた範囲) の中で宣言されているため、 ブロックの外からは見えません。

**ブロックの中でも外でも \`orderId\` を表示できるように直してください。** 表示は 2 回とも残したままにします。

## 期待する出力

\`\`\`
A-1001
A-1001
\`\`\`

## ポイント

- 変数が見える範囲 (スコープ) は、 宣言した場所で決まります。 ブロックの中で宣言すると、 その中だけになります。
- 外でも使いたい変数は、 **ブロックの外で宣言** します。
- 内側からは外が見えます。 逆に外からは内側が見えません。 一方通行です。
- \`console.log\` をブロックの中に移して逃げると、 「外からも使う」という要件を満たせません。 表示は中と外で 1 回ずつ残してください。
`,
  starterFiles: singleFile(
    `// 下のコードは最後の行でエラーになる。
// orderId をブロックの中でも外でも表示できるように直すこと。
// 表示は「ブロックの中で 1 回」「ブロックの外で 1 回」の合計 2 回。

{
  const orderId = "A-1001";
}
console.log(orderId);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "ブロックの中と外で 2 回出力される",
      expectedStdout: "A-1001\nA-1001",
    },
  ],
  hints: [
    "エラーの原因は `console.log` の側ではなく、 `orderId` を宣言している **場所** です。",
    "外からも使いたいなら、 宣言をブロックの外に出します。 ブロックの中からは外の変数がそのまま見えるので、 中の `console.log` はそのままで動きます。",
    '解答例:\n```ts\nconst orderId = "A-1001";\n\n{\n  console.log(orderId);\n}\n\nconsole.log(orderId);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const orderId = "A-1001";

{
  console.log(orderId);
}

console.log(orderId);
`,
  badSolutions: [
    {
      code: `{
  const orderId = "A-1001";
  console.log(orderId);
}
`,
      description:
        "宣言を外に出さず、 console.log のほうをブロックの中に移してしまったため、 ブロックの外からは相変わらず使えない",
    },
  ],
  mdnSections: [{ heading: "変数のスコープ" }, { heading: "宣言と初期化" }],
};
