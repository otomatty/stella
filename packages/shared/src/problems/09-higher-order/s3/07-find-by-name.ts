import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09FindByName: Assignment = {
  id: "S3-Ch09-07-find-by-name",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 7,
  title: "名前で最初に一致するユーザーを探す (find)",
  newConcept: "Array.prototype.find で最初の一致を取り出す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

\`{ name, age }\` のユーザー配列と探す名前 \`target\` を受け取り、 最初に一致したユーザーオブジェクトを返す関数 \`findByName\` を実装してください。 見つからなければ \`undefined\` を返します。 \`find\` を使ってください。

\`\`\`js
findByName(
  [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }],
  "Bob"
);
// → { name: "Bob", age: 25 }

findByName([{ name: "Alice", age: 30 }], "Carol");
// → undefined

findByName([], "anything");
// → undefined
\`\`\`

## ポイント

- \`users.find((u) => u.name === target)\` で 1 行。
- 見つからないとき \`find\` は自動で \`undefined\` を返します。
`,
  starterFiles: singleFile(`function findByName(users, target) {
  // ここを実装してください (find を使う)
}
`),
  entryPoints: ["findByName"],
  demoCall: `console.log(findByName([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }], "Bob"));`,
  tests: [
    {
      name: "Bob を見つける",
      code: `(() => { const r = findByName([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }], "Bob"); return r && r.name === "Bob" && r.age === 25; })()`,
    },
    {
      name: "見つからない場合は undefined",
      code: `findByName([{ name: "Alice", age: 30 }], "Carol") === undefined`,
    },
    {
      name: "空配列でも undefined",
      code: `findByName([], "anything") === undefined`,
    },
    {
      name: "最初の一致を返す",
      code: `(() => { const r = findByName([{ name: "x", age: 1 }, { name: "x", age: 2 }], "x"); return r.age === 1; })()`,
    },
  ],
  hints: [
    "users.find((u) => u.name === target);",
    "解答例:\n```js\nfunction findByName(users, target) {\n  return users.find((u) => u.name === target);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
        { kind: "method", name: "find", label: "Array.find を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function findByName(users, target) {
  return users.find((u) => u.name === target);
}
`,
  badSolutions: [
    {
      code: `function findByName(users, target) {
  return users.filter((u) => u.name === target);
}
`,
      description: "filter を使っていて単一のユーザーではなく配列を返している",
    },
    {
      code: `function findByName(users, target) {
  return users[0];
}
`,
      description: "find していない",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.find()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/find",
      pageTitle: "Array.prototype.find()",
    },
  ],
};
