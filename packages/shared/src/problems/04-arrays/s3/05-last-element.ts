import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04LastElement: Assignment = {
  id: "S3-Ch04-05-last-element",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 5,
  title: "配列の末尾要素を返す (空なら undefined)",
  newConcept: "境界条件と添字の関係を意識する",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

配列 \`arr\` を受け取り、 末尾要素を返す関数 \`lastElement\` を実装してください。 空配列のときは \`undefined\` を返します。

\`\`\`js
lastElement([1, 2, 3]);  // → 3
lastElement(["a"]);      // → "a"
lastElement([]);         // → undefined
lastElement([null]);     // → null
\`\`\`

## ポイント

- 添字は \`arr.length - 1\` です。
- 空配列の場合 \`arr[-1]\` ではなく単に \`arr[0]\` を返すと \`undefined\` になります (空のときは \`length === 0\` で \`-1\` 番目はそもそも存在しません)。
- \`arr.at(-1)\` を使う方法もあります (S2 で導入済み)。
`,
  starterFiles: singleFile(`function lastElement(arr) {
  // ここを実装してください
}
`),
  entryPoints: ["lastElement"],
  demoCall: `console.log(lastElement([1, 2, 3]));`,
  tests: [
    { name: "lastElement([1,2,3]) は 3", code: `lastElement([1,2,3]) === 3` },
    { name: 'lastElement(["a"]) は "a"', code: `lastElement(["a"]) === "a"` },
    { name: "lastElement([]) は undefined", code: `lastElement([]) === undefined` },
    { name: "lastElement([null]) は null", code: `lastElement([null]) === null` },
    { name: "lastElement([10,20,30,40]) は 40", code: `lastElement([10,20,30,40]) === 40` },
  ],
  hints: [
    "arr[arr.length - 1] で末尾、 空のときは undefined。",
    "解答例:\n```js\nfunction lastElement(arr) {\n  return arr[arr.length - 1];\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で末尾要素を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function lastElement(arr) {
  return arr[arr.length - 1];
}
`,
  badSolutions: [
    {
      code: `function lastElement(arr) {
  return arr[0];
}
`,
      description: "先頭要素を返している",
    },
    {
      code: `function lastElement(arr) {
  return arr.length;
}
`,
      description: "要素ではなく要素数を返している",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.at()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/at",
      pageTitle: "Array.prototype.at()",
    },
  ],
};
