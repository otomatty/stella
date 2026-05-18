import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03ReplaceSimple: Assignment = {
  id: "S1-Ch03-10-replace-simple",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 10,
  title: "replace で文字列を置き換える",
  newConcept: "文字列.replace(古い, 新しい) で最初の一致を置き換える",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"I like cats"\` の \`"cats"\` を \`"dogs"\` に置き換えて出力してください。

\`replace(古い文字列, 新しい文字列)\` を使います。 **最初に見つかった 1 箇所** だけが置換されます。

## 期待する出力

\`\`\`
I like dogs
\`\`\`
`,
  starterFiles: singleFile(`// 説明文の元文字列に replace を使い、 説明文で指定された旧文字列を新文字列に置き換えて console.log で出力する

`),
  tests: [
    {
      name: "stdout が I like dogs になる",
      expectedStdout: "I like dogs",
    },
  ],
  hints: [
    "置換は `replace(古い, 新しい)` です。",
    "`\"I like cats\".replace(\"cats\", \"dogs\")` で `\"I like dogs\"` が返ります。",
    "解答例:\n```js\nconsole.log(\"I like cats\".replace(\"cats\", \"dogs\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "replace", label: "replace を呼ぶ" },
      ],
    },
  },
  solution: `console.log("I like cats".replace("cats", "dogs"));
`,
  badSolutions: [
    {
      code: `console.log("I like dogs");
`,
      description: "replace を使わず置き換え後の文字列を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.replace()" },
  ],
};
