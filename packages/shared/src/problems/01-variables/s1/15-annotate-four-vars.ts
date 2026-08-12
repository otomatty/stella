import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01AnnotateFourVars: Assignment = {
  id: "S1-Ch01-121-annotate-four-vars",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 15,
  title: "4 つの変数に型注釈を付けて宣言する",
  newConcept: "型注釈は 変数名: 型 = 値 の順で書き、型名はすべて小文字",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 4 つの変数を、 型注釈を **付けて** 宣言し、 上から順に \`console.log\` で表示してください。 値は次のとおりとします。

| 意味 | 変数名 | 値 | 型 |
| --- | --- | --- | --- |
| 商品名 | \`productName\` | \`"ブレンドコーヒー"\` | 文字列 |
| 在庫数 | \`stockCount\` | \`25\` | 数値 |
| 割引率 | \`discountRate\` | \`0.2\` | 数値 |
| 販売中かどうか | \`isOnSale\` | \`true\` | 真偽値 |

## 期待する出力

\`\`\`
ブレンドコーヒー
25
0.2
true
\`\`\`

## ポイント

- 型注釈は \`const 変数名: 型 = 値;\` の順で書きます。 変数名が先、 コロンの右が型、 イコールの右が値です。
- 型名はすべて小文字です (\`string\` / \`number\` / \`boolean\`)。
- 割引率の \`0.2\` のような小数も \`number\` 型です。 TypeScript は整数と小数を区別しません。
`,
  starterFiles: singleFile(
    `// 商品名（文字列）


// 在庫数（数値）


// 割引率（数値）


// 販売中かどうか（真偽値）


// 4 つを console.log で順に表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "4 行が順に出力される",
      expectedStdout: "ブレンドコーヒー\n25\n0.2\ntrue",
    },
  ],
  hints: [
    "書き方は `const productName: string = \"ブレンドコーヒー\";` です。 変数名 → コロン → 型 → イコール → 値の順です。",
    "真偽値の型名は `boolean` です。 `Boolean` のように大文字で始めると別のものになってしまいます。",
    '解答例:\n```ts\nconst productName: string = "ブレンドコーヒー";\nconst stockCount: number = 25;\nconst discountRate: number = 0.2;\nconst isOnSale: boolean = true;\n\nconsole.log(productName);\nconsole.log(stockCount);\nconsole.log(discountRate);\nconsole.log(isOnSale);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const productName: string = "ブレンドコーヒー";
const stockCount: number = 25;
const discountRate: number = 0.2;
const isOnSale: boolean = true;

console.log(productName);
console.log(stockCount);
console.log(discountRate);
console.log(isOnSale);
`,
  badSolutions: [
    {
      code: `const productName: string = ブレンドコーヒー;
const stockCount: number = 25;
const discountRate: number = 0.2;
const isOnSale: boolean = true;

console.log(productName);
console.log(stockCount);
console.log(discountRate);
console.log(isOnSale);
`,
      description:
        "文字列の値をクォートで囲み忘れており、 ブレンドコーヒー という名前の変数を探しに行ってエラーになる",
    },
  ],
  mdnSections: [{ heading: "データ型" }, { heading: "宣言と初期化" }],
};
