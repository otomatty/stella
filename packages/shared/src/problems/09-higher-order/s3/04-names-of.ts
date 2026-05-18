import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09NamesOf: Assignment = {
  id: "S3-Ch09-04-names-of",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 4,
  title: "ユーザー配列から name だけ抜き出す",
  newConcept: "map でオブジェクトのプロパティを取り出す",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

\`{ name: string, age: number }\` の形のユーザー配列 \`users\` を受け取り、 \`name\` だけの配列を返す関数 \`namesOf\` を実装してください。 \`map\` を使ってください。

\`\`\`js
namesOf([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);
// → ["Alice", "Bob"]

namesOf([]);  // → []
\`\`\`

## ポイント

- \`users.map((u) => u.name)\` で 1 行。
`,
  starterFiles: singleFile(`function namesOf(users) {
  // ここを実装してください (map を使う)
}
`),
  entryPoints: ["namesOf"],
  demoCall: `console.log(namesOf([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }]));`,
  tests: [
    {
      name: '["Alice", "Bob"]',
      code: `JSON.stringify(namesOf([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }])) === '["Alice","Bob"]'`,
    },
    {
      name: "空配列は空配列",
      code: `(() => { const r = namesOf([]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "1 要素",
      code: `JSON.stringify(namesOf([{ name: "Solo", age: 40 }])) === '["Solo"]'`,
    },
    {
      name: "3 要素",
      code: `JSON.stringify(namesOf([{ name: "a", age: 1 }, { name: "b", age: 2 }, { name: "c", age: 3 }])) === '["a","b","c"]'`,
    },
  ],
  hints: [
    "users.map((u) => u.name);",
    "解答例:\n```js\nfunction namesOf(users) {\n  return users.map((u) => u.name);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "method", name: "map", label: "Array.map を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function namesOf(users) {
  return users.map((u) => u.name);
}
`,
  badSolutions: [
    {
      code: `function namesOf(users) {
  return users;
}
`,
      description: "オブジェクトの配列をそのまま返している",
    },
    {
      code: `function namesOf(users) {
  return users.map((u) => u.age);
}
`,
      description: "age を取り出してしまっている",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.map()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      pageTitle: "Array.prototype.map()",
    },
  ],
};
