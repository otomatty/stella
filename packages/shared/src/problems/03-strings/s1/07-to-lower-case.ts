import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03ToLowerCase: Assignment = {
  id: "S1-Ch03-07-to-lower-case",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 7,
  title: "toLowerCase で小文字に変換する",
  newConcept: "文字列.toLowerCase() で小文字版を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"WORLD"\` を **小文字** に変換して出力してください。

\`toLowerCase()\` メソッドを使います。

## 期待する出力

\`\`\`
world
\`\`\`
`,
  starterFiles: singleFile(`// console.log で "WORLD".toLowerCase() を呼ぶ

`),
  tests: [
    {
      name: "stdout が world になる",
      expectedStdout: "world",
    },
  ],
  hints: [
    "小文字化は `toLowerCase()` メソッドです。",
    "`\"WORLD\".toLowerCase()` で `\"world\"` が返ります。",
    "解答例:\n```js\nconsole.log(\"WORLD\".toLowerCase());\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "toLowerCase", label: "toLowerCase を呼ぶ" },
      ],
    },
  },
  solution: `console.log("WORLD".toLowerCase());
`,
  badSolutions: [
    {
      code: `console.log("world");
`,
      description: "toLowerCase を使わず小文字の文字列を直接書いている",
    },
  ],
};
