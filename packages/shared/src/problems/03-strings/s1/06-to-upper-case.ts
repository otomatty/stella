import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03ToUpperCase: Assignment = {
  id: "S1-Ch03-06-to-upper-case",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 6,
  title: "toUpperCase で大文字に変換する",
  newConcept: "文字列.toUpperCase() で大文字版を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"hello"\` を **大文字** に変換して出力してください。

\`toUpperCase()\` メソッドを使います。 メソッドなので **末尾にカッコ \`()\`** が付きます。

## 期待する出力

\`\`\`
HELLO
\`\`\`
`,
  starterFiles: singleFile(`// console.log で "hello".toUpperCase() を呼ぶ

`),
  tests: [
    {
      name: "stdout が HELLO になる",
      expectedStdout: "HELLO",
    },
  ],
  hints: [
    "大文字化は `toUpperCase()` メソッドです。 末尾の `()` を忘れずに。",
    "`\"hello\".toUpperCase()` で `\"HELLO\"` が返ります。",
    "解答例:\n```js\nconsole.log(\"hello\".toUpperCase());\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "toUpperCase", label: "toUpperCase を呼ぶ" },
      ],
    },
  },
  solution: `console.log("hello".toUpperCase());
`,
  badSolutions: [
    {
      code: `console.log("HELLO");
`,
      description: "toUpperCase を使わず大文字の文字列を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.toUpperCase()" },
  ],
};
