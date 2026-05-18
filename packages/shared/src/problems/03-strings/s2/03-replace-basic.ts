import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03ReplaceBasic: Assignment = {
  id: "S2-Ch03-03-replace-basic",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 3,
  title: "replace で最初の 1 箇所を置換する",
  newConcept: "replace は最初に見つかった箇所だけ置き換える",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"Hello World"\` の \`"World"\` を \`"JavaScript"\` に置き換えて出力してください。

## 期待する出力

\`\`\`
Hello JavaScript
\`\`\`

## ポイント

- \`"Hello World".replace("World", "JavaScript")\` → \`"Hello JavaScript"\`
- \`replace\` は **最初に見つかった 1 箇所だけ** を置き換えます。 全箇所を置きたいときは次の \`replaceAll\` を使います。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// その変数に対して replace で部分文字列を置換した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が Hello JavaScript になる",
      expectedStdout: "Hello JavaScript",
    },
  ],
  hints: [
    "`text.replace(\"World\", \"JavaScript\")` で 1 箇所を置換します。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst text = \"Hello World\";\nconsole.log(text.replace(\"World\", \"JavaScript\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "replace", label: "replace を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const text = "Hello World";
console.log(text.replace("World", "JavaScript"));
`,
  badSolutions: [
    {
      code: `console.log("Hello JavaScript");
`,
      description: "replace を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.replace()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/replace", pageTitle: "String.prototype.replace()" },
  ],
};
