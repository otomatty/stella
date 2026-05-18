import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08WithProperty: Assignment = {
  id: "S3-Ch08-02-with-property",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 2,
  title: "プロパティを追加した新しいオブジェクトを返す",
  newConcept: "スプレッド構文 \`{ ...obj, [key]: value }\` で非破壊更新",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

オブジェクト \`obj\`、 文字列キー \`key\`、 値 \`value\` を受け取り、 \`obj\` に \`{[key]: value}\` を **追加した新しいオブジェクト** を返す関数 \`withProperty\` を実装してください。 元の \`obj\` は変更しません。

\`\`\`js
withProperty({ a: 1 }, "b", 2);          // → { a: 1, b: 2 }
withProperty({ name: "Alice" }, "age", 30);
// → { name: "Alice", age: 30 }
withProperty({ a: 1 }, "a", 99);          // → { a: 99 }   (上書き)
\`\`\`

## ポイント

- スプレッド構文 \`{ ...obj, [key]: value }\` で新しいオブジェクトを作れます。
- \`[key]\` のようにブラケットを付けると、 動的なキー名でプロパティを定義できます (計算済みプロパティ名)。
`,
  starterFiles: singleFile(`function withProperty(obj, key, value) {
  // ここを実装してください (obj を変更しない)
}
`),
  entryPoints: ["withProperty"],
  demoCall: `console.log(withProperty({ a: 1 }, "b", 2));`,
  tests: [
    {
      name: 'withProperty({a:1}, "b", 2) は {a:1, b:2}',
      code: `(() => { const r = withProperty({ a: 1 }, "b", 2); return r.a === 1 && r.b === 2; })()`,
    },
    {
      name: 'withProperty({name:"Alice"}, "age", 30) は {name:"Alice", age:30}',
      code: `(() => { const r = withProperty({ name: "Alice" }, "age", 30); return r.name === "Alice" && r.age === 30; })()`,
    },
    {
      name: '上書き: withProperty({a:1}, "a", 99) は {a:99}',
      code: `(() => { const r = withProperty({ a: 1 }, "a", 99); return r.a === 99; })()`,
    },
    {
      name: "元の obj は変更されない",
      code: `(() => { const src = { a: 1 }; withProperty(src, "b", 2); return src.b === undefined; })()`,
    },
  ],
  hints: [
    "return { ...obj, [key]: value };",
    "解答例:\n```js\nfunction withProperty(obj, key, value) {\n  return { ...obj, [key]: value };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で新しいオブジェクトを返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function withProperty(obj, key, value) {
  return { ...obj, [key]: value };
}
`,
  badSolutions: [
    {
      code: `function withProperty(obj, key, value) {
  obj[key] = value;
  return obj;
}
`,
      description: "元の obj を破壊している",
    },
    {
      code: `function withProperty(obj, key, value) {
  return { [key]: value };
}
`,
      description: "元の obj のプロパティが消えている",
    },
  ],
  mdnSections: [
    {
      heading: "スプレッド構文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      pageTitle: "スプレッド構文",
    },
  ],
};
