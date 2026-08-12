import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07ShowProductVoid: Assignment = {
  id: "S2-Ch07-441-show-product-void",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 23,
  title: "表示するだけの関数と void",
  newConcept: "返す値が存在しない関数の戻り値の型は void",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

商品名を受け取って画面に表示するだけの関数 \`showProduct\` を作ってください。 戻り値の型注釈も付けてください。

表示する形は \`商品: \` に商品名を続けたものです。 作ったら \`"コーヒー"\` と \`"紅茶"\` を順に渡して呼び出してください。

## 期待する出力

\`\`\`
商品: コーヒー
商品: 紅茶
\`\`\`

## ポイント

- \`console.log\` は表示するだけで値を返しません。 返す値が存在しないので、 戻り値の型は \`void\` です。
- \`void\` は「返す値が存在しない」ことを表す型です。 \`undefined\` は「値がない」という値そのもので、 別物です。
- 表示と「返す」はまったく別の操作です。 結果を次の計算に使いたいときは \`return\` が必要になります。
`,
  starterFiles: singleFile(
    `// 商品名 (文字列) を受け取り、「商品: 商品名」の形で表示するだけの関数 showProduct を作る
// 戻り値の型注釈も付けること


// 作った関数に「コーヒー」「紅茶」を順に渡して呼び出す

`,
    "main.ts",
  ),
  tests: [
    {
      name: "2 件の商品名が順に表示される",
      expectedStdout: "商品: コーヒー\n商品: 紅茶",
    },
  ],
  hints: [
    "表示だけをする関数なので、 中で `console.log` を呼びます。 `return` は書きません。",
    "戻り値の型は、 引数のかっこのうしろに書きます。 返す値が存在しない関数に付ける型を思い出してください。",
    '解答例:\n```ts\nconst showProduct = (name: string): void => {\n  console.log(`商品: ${name}`);\n};\n\nshowProduct("コーヒー");\nshowProduct("紅茶");\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const showProduct = (name: string): void => {
  console.log(\`商品: \${name}\`);
};

showProduct("コーヒー");
showProduct("紅茶");
`,
  badSolutions: [
    {
      code: `const showProduct = (name: string): string => {
  return \`商品: \${name}\`;
};

showProduct("コーヒー");
showProduct("紅茶");
`,
      description:
        "表示ではなく return で返しているため、 呼び出しても画面には何も出ない",
    },
  ],
  mdnSections: [{ heading: "関数の定義" }, { heading: "関数の呼び出し" }],
};
