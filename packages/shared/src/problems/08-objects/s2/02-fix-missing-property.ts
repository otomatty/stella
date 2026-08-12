import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch08FixMissingProperty: Assignment = {
  id: "S2-Ch08-332-fix-missing-property",
  stage: "S2",
  chapterId: "Ch08",
  sequence: 2,
  title: "足りないプロパティを補う",
  newConcept: "型注釈に書いたプロパティは必須になる",
  estimatedMinutes: 9,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードはエラーになります。 エラーメッセージを読んで原因を確かめ、 直してください。

\`\`\`ts
const member: { name: string; age: number } = {
  name: "佐藤",
};
console.log(member);
\`\`\`

\`age\` の値は \`34\` とします。 直したら、 確認のために **来年の年齢** (\`age\` に 1 を足した値) も表示してください。

## 期待する出力

\`\`\`
{"name":"佐藤","age":34}
35
\`\`\`

## ポイント

- 型注釈が \`age\` を必須としているのに、 値の側に書かれていないためエラーになります。
- 「Property 'age' is missing ... but required in ...」というメッセージが、 足りないプロパティ名をそのまま教えてくれています。
- 足りないプロパティを読み取ると \`undefined\` になります。 \`undefined + 1\` は \`NaN\` (数値ではない) になるので、 計算結果でも気づけます。
- 年齢は数値です。 \`"34"\` のようにクォートで囲むと文字列になり、 足し算が連結になってしまいます。
`,
  starterFiles: singleFile(
    `// このコードはエラーになる。 原因を直すこと（age は 34）。

const member: { name: string; age: number } = {
  name: "佐藤",
};
console.log(member);

// 直したら、 来年の年齢（age に 1 を足した値）も表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "補完したオブジェクトと来年の年齢が出力される",
      expectedStdout: '{"name":"佐藤","age":34}\n35',
    },
  ],
  hints: [
    "エラーメッセージの中に、 足りないプロパティの名前がそのまま書かれています。",
    "型注釈は正しいので、 直すのは値の側です。 `name` の下にもう 1 行足します。",
    '解答例:\n```ts\nconst member: { name: string; age: number } = {\n  name: "佐藤",\n  age: 34,\n};\nconsole.log(member);\nconsole.log(member.age + 1);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const member: { name: string; age: number } = {
  name: "佐藤",
  age: 34,
};
console.log(member);
console.log(member.age + 1);
`,
  badSolutions: [
    {
      code: `const member = {
  name: "佐藤",
  age: "34",
};
console.log(member);
console.log(member.age + 1);
`,
      description:
        "年齢をクォートで囲んで文字列にしたうえ型注釈も外しており、 来年の年齢が足し算ではなく連結になっている",
    },
  ],
  mdnSections: [
    { heading: "オブジェクトとプロパティ" },
    { heading: "新しいオブジェクトの作成" },
  ],
};
