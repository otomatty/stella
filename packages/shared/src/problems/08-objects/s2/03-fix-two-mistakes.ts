import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch08FixTwoMistakes: Assignment = {
  id: "S2-Ch08-333-fix-two-mistakes",
  stage: "S2",
  chapterId: "Ch08",
  sequence: 3,
  title: "型の取り違えとプロパティ名のタイポを直す",
  newConcept: "型注釈があるとタイポと型違いを実行前に見つけられる",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードには間違いが **2 か所** あります。 エラーメッセージを手がかりに見つけて直してください。

\`\`\`ts
const order: { id: string; total: number } = {
  id: 1001,
  totl: 3500,
};

console.log(order.id);
console.log(order.total);
\`\`\`

直したら、 \`id\` がちゃんと文字列になっていることを確かめるため、 **\`typeof order.id\` も表示** してください。

## 期待する出力

\`\`\`
1001
3500
string
\`\`\`

## ポイント

- 1 つ目は \`id\` の型です。 \`string\` と宣言しているのに数値の \`1001\` を入れています。 クォートで囲んで文字列にします。
- 2 つ目はプロパティ名のタイポです。 \`totl\` ではなく \`total\` が正しく、 このままだと \`total\` が不足し、 かつ \`totl\` という余分なプロパティがあることになります。
- **\`console.log\` は \`"1001"\` も \`1001\` も同じ見た目で表示します。** どちらなのかは \`typeof\` で確かめられます。
- タイポのほうは、 直さないと \`order.total\` が \`undefined\` になるので表示ですぐ分かります。 JavaScript なら画面を見るまで気づけませんでした。
`,
  starterFiles: singleFile(
    `// 間違いが 2 か所ある。 両方直すこと。

const order: { id: string; total: number } = {
  id: 1001,
  totl: 3500,
};

console.log(order.id);
console.log(order.total);

// 直したら typeof order.id も表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "id・合計・id の型が順に出力される",
      expectedStdout: "1001\n3500\nstring",
    },
  ],
  hints: [
    "エラーは 2 つ出ています。 1 つは型が合わない、 もう 1 つはプロパティ名に関するものです。",
    "型注釈のほうは正しいので、 直すのはどちらも値の側です。 `id` にはクォートを付け、 名前の綴りを型注釈と合わせます。",
    '解答例:\n```ts\nconst order: { id: string; total: number } = {\n  id: "1001",\n  total: 3500,\n};\n\nconsole.log(order.id);\nconsole.log(order.total);\nconsole.log(typeof order.id);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const order: { id: string; total: number } = {
  id: "1001",
  total: 3500,
};

console.log(order.id);
console.log(order.total);
console.log(typeof order.id);
`,
  badSolutions: [
    {
      code: `const order: { id: string; total: number } = {
  id: 1001,
  total: 3500,
};

console.log(order.id);
console.log(order.total);
console.log(typeof order.id);
`,
      description:
        "表示が undefined になるタイポだけを直し、 見た目が変わらない id の型の取り違えを見落としている",
    },
  ],
  mdnSections: [
    { heading: "オブジェクトとプロパティ" },
    { heading: "プロパティのアクセス" },
  ],
};
