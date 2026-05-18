import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09Adults: Assignment = {
  id: "S3-Ch09-05-adults",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 5,
  title: "成人 (18 歳以上) だけ抽出する",
  newConcept: "filter でオブジェクトの条件抽出",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

\`{ name, age }\` の配列 \`users\` から、 \`age >= 18\` のユーザーだけを取り出した新しい配列を返す関数 \`adults\` を実装してください。 \`filter\` を使ってください。

\`\`\`js
adults([
  { name: "Alice", age: 30 },
  { name: "Bob",   age: 15 },
  { name: "Carol", age: 18 },
]);
// → [{ name: "Alice", age: 30 }, { name: "Carol", age: 18 }]
\`\`\`

## ポイント

- \`users.filter((u) => u.age >= 18)\` で 1 行。
`,
  starterFiles: singleFile(`function adults(users) {
  // ここを実装してください (filter を使う)
}
`),
  entryPoints: ["adults"],
  demoCall: `console.log(adults([{ name: "Alice", age: 30 }, { name: "Bob", age: 15 }]));`,
  tests: [
    {
      name: "Alice と Carol だけ残る",
      code: `(() => {
        const r = adults([
          { name: "Alice", age: 30 },
          { name: "Bob", age: 15 },
          { name: "Carol", age: 18 },
        ]);
        return r.length === 2 && r[0].name === "Alice" && r[1].name === "Carol";
      })()`,
    },
    {
      name: "全員未成年なら空",
      code: `(() => { const r = adults([{ name: "x", age: 5 }, { name: "y", age: 10 }]); return r.length === 0; })()`,
    },
    {
      name: "境界 (18 歳ちょうど) を含む",
      code: `(() => { const r = adults([{ name: "x", age: 18 }]); return r.length === 1 && r[0].age === 18; })()`,
    },
    {
      name: "空入力は空出力",
      code: `(() => { const r = adults([]); return Array.isArray(r) && r.length === 0; })()`,
    },
  ],
  hints: [
    "users.filter((u) => u.age >= 18);",
    "解答例:\n```js\nfunction adults(users) {\n  return users.filter((u) => u.age >= 18);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "method", name: "filter", label: "Array.filter を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function adults(users) {
  return users.filter((u) => u.age >= 18);
}
`,
  badSolutions: [
    {
      code: `function adults(users) {
  return users.filter((u) => u.age > 18);
}
`,
      description: "境界 (18 ちょうど) を弾いてしまっている",
    },
    {
      code: `function adults(users) {
  return users;
}
`,
      description: "filter していない",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.filter()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/filter",
      pageTitle: "Array.prototype.filter()",
    },
  ],
};
