import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03Length: Assignment = {
  id: "S1-Ch03-05-length",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 5,
  title: "文字列の length を取得する",
  newConcept: "文字列.length で文字数を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"JavaScript"\` の文字数を出力してください。

文字列の **後ろに \`.length\`** を付けると、 文字数が得られます。 (\`.length\` の後ろにカッコは付けません。)

## 期待する出力

\`\`\`
10
\`\`\`
`,
  starterFiles: singleFile(`// console.log で "JavaScript".length を出力する
// .length にカッコは付かない

`),
  tests: [
    {
      name: "stdout が 10 になる",
      expectedStdout: "10",
    },
  ],
  hints: [
    "`.length` は **プロパティ** で、 メソッドではないのでカッコ `()` は付けません。",
    "`\"JavaScript\".length` で `10` が得られます。",
    "解答例:\n```js\nconsole.log(\"JavaScript\".length);\n```",
  ],
  solution: `console.log("JavaScript".length);
`,
  mdnSections: [
    { heading: "String: length プロパティ" },
  ],
};
