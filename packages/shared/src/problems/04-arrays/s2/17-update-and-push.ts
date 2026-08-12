import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04UpdateAndPush: Assignment = {
  id: "S2-Ch04-321-update-and-push",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 17,
  title: "配列の書き換えと追加を順に確かめる",
  newConcept: "const の配列でも中身の書き換えと追加はできる",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

商品名の配列を作り、 次の操作を順に行って、 **そのつど \`console.log\` で確認** してください。

1. \`["コーヒー", "紅茶"]\` で作る
2. 2 番目を \`"ほうじ茶"\` に書き換える
3. \`"緑茶"\` を末尾に追加する

配列は \`const\` で宣言してください。

## 期待する出力

\`\`\`
["コーヒー","紅茶"]
["コーヒー","ほうじ茶"]
["コーヒー","ほうじ茶","緑茶"]
\`\`\`

## ポイント

- 書き換えは **インデックスへの代入** (\`items[1] = "ほうじ茶";\`)、 追加は **\`push\`** (\`items.push("緑茶");\`) です。
- \`const\` で宣言していても、 どちらも実行できます。 禁止されているのは \`items = [...]\` という **変数そのものへの再代入** だけです。
- 2 番目の要素はインデックス \`1\` です。
`,
  starterFiles: singleFile(
    `// 商品名の配列を const で作って表示する


// 2 番目を "ほうじ茶" に書き換えて表示する


// "緑茶" を末尾に追加して表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "作成・書き換え・追加のたびに配列が出力される",
      expectedStdout:
        '["コーヒー","紅茶"]\n["コーヒー","ほうじ茶"]\n["コーヒー","ほうじ茶","緑茶"]',
    },
  ],
  hints: [
    "書き換えたい位置を角かっこで指定して、 そこに新しい値を代入します。",
    "末尾への追加は `push` です。 `items.push(\"緑茶\");` と書くと、 配列そのものが 1 要素長くなります。",
    '解答例:\n```ts\nconst items = ["コーヒー", "紅茶"];\nconsole.log(items);\n\nitems[1] = "ほうじ茶";\nconsole.log(items);\n\nitems.push("緑茶");\nconsole.log(items);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const items = ["コーヒー", "紅茶"];
console.log(items);

items[1] = "ほうじ茶";
console.log(items);

items.push("緑茶");
console.log(items);
`,
  badSolutions: [
    {
      code: `const items = ["コーヒー", "紅茶"];
console.log(items);

items = ["コーヒー", "ほうじ茶"];
console.log(items);

items.push("緑茶");
console.log(items);
`,
      description:
        "1 要素の書き換えのつもりで配列全体を再代入しており、 const の変数に代入し直そうとして実行が止まる",
    },
  ],
  mdnSections: [{ heading: "配列要素の参照" }, { heading: "配列へのデータ追加" }],
};
