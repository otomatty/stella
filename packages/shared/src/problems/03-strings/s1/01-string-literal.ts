import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03StringLiteral: Assignment = {
  id: "S1-Ch03-01-string-literal",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 1,
  title: "文字列リテラルを書く",
  newConcept: "文字列はダブルクォートかシングルクォートで囲む",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

文字列 \`"こんにちは"\` を出力してください。 文字列は \`"\` (ダブルクォート) か \`'\` (シングルクォート) で囲みます。

## 期待する出力

\`\`\`
こんにちは
\`\`\`
`,
  starterFiles: singleFile(`// 説明文の文字列を "" または '' で囲んで console.log で出力する

`),
  tests: [
    {
      name: "stdout が こんにちは になる",
      expectedStdout: "こんにちは",
    },
  ],
  hints: [
    "文字列は **クォートで囲む** 必要があります。",
    "`console.log(\"こんにちは\");` のように書きます。",
    "解答例:\n```js\nconsole.log(\"こんにちは\");\n```",
  ],
  solution: `console.log("こんにちは");
`,
  mdnSections: [
    { heading: "文字列リテラル" },
  ],
};
