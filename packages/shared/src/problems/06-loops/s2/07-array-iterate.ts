import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06ArrayIterate: Assignment = {
  id: "S2-Ch06-07-array-iterate",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 7,
  title: "for で配列要素を 1 つずつ出す",
  newConcept: "i < arr.length でループし arr[i] にアクセスする",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

配列 \`["apple", "banana", "cherry"]\` を for ループで巡って、 各要素を 1 行ずつ出力してください。

## 期待する出力

\`\`\`
apple
banana
cherry
\`\`\`

## ポイント

- \`for (let i = 0; i < arr.length; i++) { console.log(arr[i]); }\` の形が基本。
- \`arr.length\` は配列の長さ。
`,
  starterFiles: singleFile(`// 文字列の配列を const の変数に入れる


// for ループで添字 0 から length 未満まで回し、 各要素を console.log で出力する

`),
  tests: [
    {
      name: "stdout が apple/banana/cherry の 3 行になる",
      expectedStdout: "apple\nbanana\ncherry",
    },
  ],
  hints: [
    "`for (let i = 0; i < fruits.length; i++) { ... }` の形。",
    "中で `console.log(fruits[i]);` を呼びます。",
    "解答例:\n```js\nconst fruits = [\"apple\", \"banana\", \"cherry\"];\nfor (let i = 0; i < fruits.length; i++) {\n  console.log(fruits[i]);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const fruits = ["apple", "banana", "cherry"];
for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);
}
`,
  badSolutions: [
    {
      code: `console.log("apple");
console.log("banana");
console.log("cherry");
`,
      description: "for を使わず 1 行ずつ console.log している",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
