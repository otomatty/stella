import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08HasProperty: Assignment = {
  id: "S3-Ch08-06-has-property",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 6,
  title: "オブジェクトが指定キーを持つか判定",
  newConcept: "in 演算子 / Object.hasOwn でプロパティ存在判定",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

オブジェクト \`obj\` とキー名 \`key\` を受け取り、 \`obj\` が \`key\` を **自分自身のプロパティとして持つ** なら \`true\`、 そうでなければ \`false\` を返す関数 \`hasProperty\` を実装してください。

\`\`\`js
hasProperty({ a: 1 }, "a");                // → true
hasProperty({ a: 1 }, "b");                // → false
hasProperty({ a: undefined }, "a");        // → true   (undefined だが存在する)
hasProperty({}, "a");                      // → false
\`\`\`

## ポイント

- \`Object.hasOwn(obj, key)\` がもっとも安全な書き方。
- \`obj[key] !== undefined\` だと、 値が \`undefined\` のときに誤判定します。
`,
  starterFiles: singleFile(`function hasProperty(obj, key) {
  // ここを実装してください
}
`),
  entryPoints: ["hasProperty"],
  demoCall: `console.log(hasProperty({ a: 1 }, "a"));`,
  tests: [
    { name: 'hasProperty({a:1}, "a") は true', code: `hasProperty({ a: 1 }, "a") === true` },
    { name: 'hasProperty({a:1}, "b") は false', code: `hasProperty({ a: 1 }, "b") === false` },
    { name: 'hasProperty({a:undefined}, "a") は true', code: `hasProperty({ a: undefined }, "a") === true` },
    { name: 'hasProperty({}, "a") は false', code: `hasProperty({}, "a") === false` },
    { name: 'hasProperty({x:0}, "x") は true', code: `hasProperty({ x: 0 }, "x") === true` },
    {
      name: '継承プロパティ (Object.create({a:1}).a) は false',
      code: `(() => { const obj = Object.create({ a: 1 }); return hasProperty(obj, "a") === false; })()`,
    },
  ],
  hints: [
    "Object.hasOwn(obj, key) を使う。",
    "解答例:\n```js\nfunction hasProperty(obj, key) {\n  return Object.hasOwn(obj, key);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function hasProperty(obj, key) {
  return Object.hasOwn(obj, key);
}
`,
  badSolutions: [
    {
      code: `function hasProperty(obj, key) {
  return obj[key] !== undefined;
}
`,
      description: "値が undefined のとき false になってしまう (a:undefined で fail)",
    },
    {
      code: `function hasProperty(obj, key) {
  return true;
}
`,
      description: "常に true を返している",
    },
  ],
  mdnSections: [
    {
      heading: "Object.hasOwn()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn",
      pageTitle: "Object.hasOwn()",
    },
  ],
};
