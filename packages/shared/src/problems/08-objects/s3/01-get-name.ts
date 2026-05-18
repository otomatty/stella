import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08GetName: Assignment = {
  id: "S3-Ch08-01-get-name",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 1,
  title: "オブジェクトから name プロパティを取り出す",
  newConcept: "ドット記法でプロパティを読み出す",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

オブジェクト \`user\` を受け取り、 その \`name\` プロパティを返す関数 \`getName\` を実装してください。

\`\`\`js
getName({ name: "Alice", age: 30 });  // → "Alice"
getName({ name: "Bob" });             // → "Bob"
getName({ name: "" });                // → ""
\`\`\`

## ポイント

- \`obj.プロパティ名\` でプロパティを取り出します。
- \`obj["プロパティ名"]\` でも同じです。
`,
  starterFiles: singleFile(`function getName(user) {
  // ここを実装してください
}
`),
  entryPoints: ["getName"],
  demoCall: `console.log(getName({ name: "Alice", age: 30 }));`,
  tests: [
    {
      name: 'getName({name:"Alice", age:30}) は "Alice"',
      code: `getName({ name: "Alice", age: 30 }) === "Alice"`,
    },
    {
      name: 'getName({name:"Bob"}) は "Bob"',
      code: `getName({ name: "Bob" }) === "Bob"`,
    },
    {
      name: 'getName({name:""}) は ""',
      code: `getName({ name: "" }) === ""`,
    },
  ],
  hints: [
    "return user.name;",
    "解答例:\n```js\nfunction getName(user) {\n  return user.name;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return でプロパティを返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function getName(user) {
  return user.name;
}
`,
  badSolutions: [
    {
      code: `function getName(user) {
  return user;
}
`,
      description: "オブジェクトをそのまま返している",
    },
    {
      code: `function getName(user) {
  return "Alice";
}
`,
      description: "固定文字列を返している",
    },
  ],
  mdnSections: [
    {
      heading: "プロパティアクセサー",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Property_accessors",
      pageTitle: "プロパティアクセサー",
    },
  ],
};
