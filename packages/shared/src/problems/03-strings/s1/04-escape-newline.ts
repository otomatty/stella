import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03EscapeNewline: Assignment = {
  id: "S1-Ch03-04-escape-newline",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 4,
  title: "\\n で改行する",
  newConcept: "文字列の中で \\n を書くと改行になる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"line1\\nline2"\` のように、 文字列の中に \`\\n\` を書いて **1 回の console.log で 2 行** 出力してください。

## 期待する出力

\`\`\`
line1
line2
\`\`\`

## ポイント

- \`\\n\` は **改行を表す特別な文字列** (エスケープシーケンス) です。
- \`console.log\` を 2 回呼ばなくても、 \`\\n\` を間に挟めば 2 行になります。
`,
  starterFiles: singleFile(`// console.log の中で "line1\\nline2" と書く

`),
  tests: [
    {
      name: "stdout が line1 と line2 の 2 行になる",
      expectedStdout: "line1\nline2",
    },
  ],
  hints: [
    "`\\n` (バックスラッシュと n) は改行を表します。",
    "`console.log(\"line1\\nline2\");` で 2 行出力されます。",
    "解答例:\n```js\nconsole.log(\"line1\\nline2\");\n```",
  ],
  solution: `console.log("line1\\nline2");
`,
  mdnSections: [
    { heading: "エスケープシーケンス" },
  ],
};
