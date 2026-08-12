import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04DeclareTypedArrays: Assignment = {
  id: "S2-Ch04-311-declare-typed-arrays",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 14,
  title: "3 種類の配列を型注釈付きで宣言する",
  newConcept: "配列の型は「要素の型 + []」",
  estimatedMinutes: 9,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 3 つの配列を **型注釈を付けて** 宣言し、 それぞれ \`console.log\` で表示してください。

| 内容 | 値 |
| --- | --- |
| 曜日名の配列 | \`"月"\` / \`"火"\` / \`"水"\` |
| 金額の配列 | \`480\` / \`500\` / \`450\` |
| 在庫があるかどうかの配列 | \`true\` / \`false\` / \`true\` |

## 期待する出力

\`\`\`
["月","火","水"]
[480,500,450]
[true,false,true]
\`\`\`

## ポイント

- 型注釈は **「要素の型 + \`[]\`」** の形です。 文字列の配列なら \`string[]\`、 数値の配列なら \`number[]\` です。
- 配列をそのまま \`console.log\` に渡すと、 中身が並んだ形で表示されます。
- 金額は数値です。 \`"480"\` のようにクォートで囲むと文字列になり、 \`number[]\` には入れられません。
- 初期値があるので、 実際には推論に任せて型注釈を省略しても構いません。 ここでは書き方を覚えるために付けます。
`,
  starterFiles: singleFile(
    `// 曜日名の配列を string[] で宣言する


// 金額の配列を number[] で宣言する


// 在庫があるかどうかの配列を boolean[] で宣言する


// 3 つを宣言した順に表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "3 つの配列が順に出力される",
      expectedStdout: '["月","火","水"]\n[480,500,450]\n[true,false,true]',
    },
  ],
  hints: [
    "宣言の形は `const days: string[] = [...];` です。 コロンの後ろが型、 イコールの後ろが値です。",
    "真偽値の配列の型注釈は `boolean[]` です。 値のほうはクォートを付けずに `true` / `false` と書きます。",
    '解答例:\n```ts\nconst days: string[] = ["月", "火", "水"];\nconst prices: number[] = [480, 500, 450];\nconst inStock: boolean[] = [true, false, true];\n\nconsole.log(days);\nconsole.log(prices);\nconsole.log(inStock);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const days: string[] = ["月", "火", "水"];
const prices: number[] = [480, 500, 450];
const inStock: boolean[] = [true, false, true];

console.log(days);
console.log(prices);
console.log(inStock);
`,
  badSolutions: [
    {
      code: `const days: string[] = ["月", "火", "水"];
const prices = ["480", "500", "450"];
const inStock: boolean[] = [true, false, true];

console.log(days);
console.log(prices);
console.log(inStock);
`,
      description:
        "金額をクォートで囲んで文字列の配列にしてしまっており、 数値ではなく文字列が並んでいる",
    },
  ],
  mdnSections: [{ heading: "配列の生成" }, { heading: "配列要素の参照" }],
};
