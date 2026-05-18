import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07DefaultGreet: Assignment = {
  id: "S3-Ch07-01-default-greet",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 1,
  title: "デフォルト引数で挨拶文を返す",
  newConcept: "デフォルトパラメータ \`name = \"ゲスト\"\` を使う",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

名前 \`name\` を受け取り、 \`"こんにちは、 <name> さん!"\` を返す関数 \`defaultGreet\` を実装してください。 \`name\` が指定されなかった場合 (\`undefined\`) は \`"ゲスト"\` を既定値として使ってください。

\`\`\`js
defaultGreet("Alice");     // → "こんにちは、 Alice さん!"
defaultGreet();            // → "こんにちは、 ゲスト さん!"
defaultGreet(undefined);   // → "こんにちは、 ゲスト さん!"
\`\`\`

## ポイント

- 関数パラメータに \`= デフォルト値\` を書くと、 引数省略時の値を設定できます。
- \`function defaultGreet(name = "ゲスト") { ... }\`
`,
  starterFiles: singleFile(`function defaultGreet(name) {
  // ここを実装してください (パラメータにデフォルト値を設定)
}
`),
  entryPoints: ["defaultGreet"],
  demoCall: `console.log(defaultGreet());`,
  tests: [
    {
      name: 'defaultGreet("Alice") は "こんにちは、 Alice さん!"',
      code: `defaultGreet("Alice") === "こんにちは、 Alice さん!"`,
    },
    {
      name: 'defaultGreet() は "こんにちは、 ゲスト さん!"',
      code: `defaultGreet() === "こんにちは、 ゲスト さん!"`,
    },
    {
      name: 'defaultGreet(undefined) は "こんにちは、 ゲスト さん!"',
      code: `defaultGreet(undefined) === "こんにちは、 ゲスト さん!"`,
    },
    {
      name: 'defaultGreet("Bob") は "こんにちは、 Bob さん!"',
      code: `defaultGreet("Bob") === "こんにちは、 Bob さん!"`,
    },
  ],
  hints: [
    "function defaultGreet(name = \"ゲスト\") { ... } のように書く。",
    "解答例:\n```js\nfunction defaultGreet(name = \"ゲスト\") {\n  return `こんにちは、 ${name} さん!`;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function defaultGreet(name = "ゲスト") {
  return \`こんにちは、 \${name} さん!\`;
}
`,
  badSolutions: [
    {
      code: `function defaultGreet(name) {
  return \`こんにちは、 \${name} さん!\`;
}
`,
      description: "デフォルト値を設定していない (省略時 undefined になる)",
    },
    {
      code: `function defaultGreet(name = "ゲスト") {
  return "こんにちは、 ゲスト さん!";
}
`,
      description: "name を使わず固定文字列を返している",
    },
  ],
  mdnSections: [
    {
      heading: "デフォルト引数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Default_parameters",
      pageTitle: "デフォルト引数",
    },
  ],
};
