import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04SecondAndLast: Assignment = {
  id: "S2-Ch04-313-second-and-last",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 16,
  title: "要素数が変わっても最後の要素を取り出す",
  newConcept: "最後の要素は length - 1 で求める",
  estimatedMinutes: 11,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

配列 \`items\` の **2 番目** と **最後** の要素を表示してください。

\`\`\`ts
let items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶"];
// 期待: "紅茶" と "ほうじ茶"
\`\`\`

そのうえで、 **要素数が変わっても正しく動く** ことを確かめます。 表示したあとに \`items\` を次の 5 要素の配列に入れ替え、 **まったく同じ 2 行をもう一度書いて** 表示してください。

\`\`\`ts
items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶", "玄米茶"];
\`\`\`

## 期待する出力

\`\`\`
紅茶
ほうじ茶
紅茶
玄米茶
\`\`\`

## ポイント

- 2 番目の要素はインデックス \`1\` です (0 から数えるため)。
- 最後の要素のインデックスは \`length - 1\` で求めます。 \`length\` は要素数なので、 そこから 1 引くと最後の位置になります。
- \`items[3]\` と直接書くと、 要素が増減したときに壊れます。 2 回目の表示で違いが出ます。
- **今回だけ \`items\` を \`let\` で宣言しています。** 中身を書き換えるのではなく、 **配列そのものを別の配列に差し替える** ためです。 中身の書き換えや末尾への追加だけなら \`const\` のままで行えます。
`,
  starterFiles: singleFile(
    `let items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶"];

// 2 番目と最後の要素を表示する（要素数が変わっても動く書き方で）


// 要素を 1 つ増やした配列に入れ替える
items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶", "玄米茶"];

// まったく同じ 2 行をもう一度書いて表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "入れ替え前後の 2 番目と最後が出力される",
      expectedStdout: "紅茶\nほうじ茶\n紅茶\n玄米茶",
    },
  ],
  hints: [
    "2 番目の要素は `items[1]` です。 インデックスは 0 から始まります。",
    "最後の要素の位置は「要素数 - 1」です。 要素数は `items.length` で取れるので、 角かっこの中に計算式をそのまま書けます。",
    '解答例:\n```ts\nlet items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶"];\n\nconsole.log(items[1]);\nconsole.log(items[items.length - 1]);\n\nitems = ["コーヒー", "紅茶", "緑茶", "ほうじ茶", "玄米茶"];\n\nconsole.log(items[1]);\nconsole.log(items[items.length - 1]);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `let items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶"];

console.log(items[1]);
console.log(items[items.length - 1]);

items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶", "玄米茶"];

console.log(items[1]);
console.log(items[items.length - 1]);
`,
  badSolutions: [
    {
      code: `let items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶"];

console.log(items[1]);
console.log(items[3]);

items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶", "玄米茶"];

console.log(items[1]);
console.log(items[3]);
`,
      description:
        "最後の要素の位置を 3 と直接書いたため、 要素が 1 つ増えた 2 回目で最後の要素を取り出せていない",
    },
  ],
  mdnSections: [{ heading: "配列要素の参照" }, { heading: "配列の長さの理解" }],
};
