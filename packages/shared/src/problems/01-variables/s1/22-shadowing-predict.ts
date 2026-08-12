import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01ShadowingPredict: Assignment = {
  id: "S1-Ch01-212-shadowing-predict",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 22,
  title: "シャドーイングの出力を予想して確かめる",
  newConcept: "同じ名前を内側で宣言すると、 外側の変数が隠れる (シャドーイング)",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードの出力を **紙の上で予想してから** 書き写して実行し、 答え合わせをしてください。

\`\`\`ts
const price = 500;

{
  const price = 300;
  console.log(price);
}

console.log(price);
\`\`\`

## 期待する出力

\`\`\`
300
500
\`\`\`

## ポイント

- ブロックの中で同じ名前を宣言すると、 **シャドーイング** が起きます。 別の変数が手前に立っている状態です。
- ブロックの中では内側の \`price\` (300) が見え、 ブロックを抜けると外側の \`price\` (500) が再び見えます。
- **外側の値は書き換わっていません。** 隠れていただけです。
- ブロックの中で \`const\` を書かずに \`price = 300;\` とすると意味が変わります。 それは宣言ではなく **外側の変数への代入** になり、 外側の値そのものが変わってしまいます。
`,
  starterFiles: singleFile(
    `// 外側の price を 500 で宣言する


// ブロックを作り、 その中で price を 300 で宣言して表示する


// ブロックの外でもう一度 price を表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "内側の 300 と外側の 500 が順に出力される",
      expectedStdout: "300\n500",
    },
  ],
  hints: [
    "ブロックの中の `console.log` からは、 内側と外側のどちらの `price` が見えているでしょうか。 近いほうが見えます。",
    "ブロックを抜けたあとは、 内側の `price` はもう存在しません。 外側の `price` が最初の値のまま残っています。",
    '解答例:\n```ts\nconst price = 500;\n\n{\n  const price = 300;\n  console.log(price);\n}\n\nconsole.log(price);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const price = 500;

{
  const price = 300;
  console.log(price);
}

console.log(price);
`,
  badSolutions: [
    {
      code: `let price = 500;

{
  price = 300;
  console.log(price);
}

console.log(price);
`,
      description:
        "ブロックの中で宣言せずに代入してしまったため、 外側の price そのものが書き換わり、 2 行目も 300 になる",
    },
  ],
  mdnSections: [{ heading: "変数のスコープ" }, { heading: "宣言と初期化" }],
};
