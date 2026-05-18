import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch01Greet: Assignment = {
  id: "S3-Ch01-03-greet",
  stage: "S3",
  chapterId: "Ch01",
  sequence: 3,
  title: "名前から挨拶文を組み立てて返す",
  newConcept: "引数をテンプレートリテラルに埋め込んで返す",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

名前 \`name\` を受け取り、 \`"Hello, <name>!"\` という挨拶文字列を返す関数 \`greet\` を実装してください。

\`\`\`js
greet("World");  // → "Hello, World!"
greet("Alice");  // → "Hello, Alice!"
greet("");       // → "Hello, !"
\`\`\`

## ポイント

- テンプレートリテラル (\`\` \` \`\`) を使うと \`\\\`Hello, \${name}!\\\`\` のように直接埋め込めます。
- 文字列連結 \`"Hello, " + name + "!"\` でも構いません。
`,
  starterFiles: singleFile(`function greet(name) {
  // ここを実装してください
}
`),
  entryPoints: ["greet"],
  demoCall: `console.log(greet("World"));`,
  tests: [
    {
      name: 'greet("World") は "Hello, World!"',
      code: `greet("World") === "Hello, World!"`,
    },
    {
      name: 'greet("Alice") は "Hello, Alice!"',
      code: `greet("Alice") === "Hello, Alice!"`,
    },
    {
      name: 'greet("") は "Hello, !"',
      code: `greet("") === "Hello, !"`,
    },
  ],
  hints: [
    "テンプレートリテラル `` `Hello, ${name}!` `` で書くと簡潔です。",
    "解答例:\n```js\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```",
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
  solution: `function greet(name) {
  return \`Hello, \${name}!\`;
}
`,
  badSolutions: [
    {
      code: `function greet(name) {
  return "Hello, World!";
}
`,
      description: "name を使っていない (固定文字列)",
    },
    {
      code: `function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
`,
      description: "console.log していて return していない",
    },
  ],
  mdnSections: [
    {
      heading: "テンプレートリテラル",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Template_literals",
      pageTitle: "テンプレートリテラル",
    },
  ],
};
