import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04ForOfTotal: Assignment = {
  id: "S2-Ch04-322-for-of-total",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 18,
  title: "for-of で 1 件ずつ表示しながら合計する",
  newConcept: "集計用の変数はループの外で宣言する",
  estimatedMinutes: 11,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

金額の配列 \`[1200, 800, 1500]\` について、 \`for-of\` を使って次の 2 つを表示してください。

- 1 件ずつ「〜円」の形で表示する (テンプレートリテラルを使う)
- 最後に合計金額を「合計: 〜円」の形で表示する

## 期待する出力

\`\`\`
1200円
800円
1500円
合計: 3500円
\`\`\`

## ポイント

- \`for (const price of prices) { ... }\` と書くと、 \`price\` に要素が 1 つずつ入ります。 インデックスではなく **要素そのもの** です。
- 1 回のループの中で、 表示と集計を両方行えます。
- **集計用の \`total\` はループの外で宣言** してください。 中で宣言すると 1 回ごとに作り直されるうえ、 スコープがブロックの中だけなのでループの外から参照できません。
- \`total\` は毎回値が変わるので \`let\` です。
`,
  starterFiles: singleFile(
    `// 金額の配列を作る


// 合計用の変数をループの外で用意する


// for-of で 1 件ずつ「〜円」を表示しながら合計に足していく


// 最後に「合計: 〜円」を表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "1 件ずつの金額と合計が出力される",
      expectedStdout: "1200円\n800円\n1500円\n合計: 3500円",
    },
  ],
  hints: [
    "テンプレートリテラルはバッククォートで囲み、 埋め込みたい式を `${...}` で書きます。",
    "合計は `total = total + price;` で足していきます。 この行はループの中、 `total` の宣言はループの外です。",
    '解答例:\n```ts\nconst prices = [1200, 800, 1500];\n\nlet total = 0;\nfor (const price of prices) {\n  console.log(`${price}円`);\n  total = total + price;\n}\n\nconsole.log(`合計: ${total}円`);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const prices = [1200, 800, 1500];

let total = 0;
for (const price of prices) {
  console.log(\`\${price}円\`);
  total = total + price;
}

console.log(\`合計: \${total}円\`);
`,
  badSolutions: [
    {
      code: `const prices = [1200, 800, 1500];

for (const price of prices) {
  let total = 0;
  console.log(\`\${price}円\`);
  total = total + price;
}

console.log(\`合計: \${total}円\`);
`,
      description:
        "集計用の変数をループのブロックの中で宣言したため、 毎回リセットされるうえループの外からは参照できず、 合計の行で止まる",
    },
  ],
  mdnSections: [{ heading: "配列の反復処理" }, { heading: "配列の長さの理解" }],
};
