import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06StringIterate: Assignment = {
  id: "S2-Ch06-12-string-iterate",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 12,
  title: "for で文字列を 1 文字ずつ出す",
  newConcept: "文字列も length と添字で扱える",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"abcd"\` の各文字を for ループで 1 行ずつ出力してください。

## 期待する出力

\`\`\`
a
b
c
d
\`\`\`

## ポイント

- 文字列も \`text.length\` と \`text[i]\` でアクセスできます。
- \`charAt(i)\` でも同じです。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// for ループで添字 0 から length 未満まで回し、 文字列[i] で 1 文字ずつ console.log で出力する

`),
  tests: [
    {
      name: "stdout が a/b/c/d の 4 行になる",
      expectedStdout: "a\nb\nc\nd",
    },
  ],
  hints: [
    "ループ条件は `i < text.length`。",
    "`text[i]` で 1 文字を取り出します。",
    "解答例:\n```js\nconst text = \"abcd\";\nfor (let i = 0; i < text.length; i++) {\n  console.log(text[i]);\n}\n```",
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
  solution: `const text = "abcd";
for (let i = 0; i < text.length; i++) {
  console.log(text[i]);
}
`,
  badSolutions: [
    {
      code: `console.log("a");
console.log("b");
console.log("c");
console.log("d");
`,
      description: "ループを使わず 1 行ずつ出力している",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
