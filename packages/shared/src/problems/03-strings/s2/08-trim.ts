import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03Trim: Assignment = {
  id: "S2-Ch03-08-trim",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 8,
  title: "trim で前後の空白を取り除く",
  newConcept: "trim は前後の空白文字を削除する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

前後にスペースの付いた文字列 \`"  Hello  "\` から、 \`trim\` で空白を取り除いて出力してください。

## 期待する出力

\`\`\`
Hello
\`\`\`

## ポイント

- \`"  Hello  ".trim()\` → \`"Hello"\`
- ユーザー入力のフォーム値を扱うときの定番処理です。
- 片側だけなら \`trimStart\` / \`trimEnd\` を使います。
`,
  starterFiles: singleFile(`// 前後に空白を含む文字列を const の変数に入れる


// その変数に対して trim を呼んで前後の空白を取り除いた結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が Hello になる",
      expectedStdout: "Hello",
    },
  ],
  hints: [
    "`text.trim()` で前後の空白を取り除きます。",
    "戻り値を `console.log` に渡します。",
    "解答例:\n```js\nconst text = \"  Hello  \";\nconsole.log(text.trim());\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "trim", label: "trim を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const text = "  Hello  ";
console.log(text.trim());
`,
  badSolutions: [
    {
      code: `console.log("Hello");
`,
      description: "trim を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.trim()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/trim", pageTitle: "String.prototype.trim()" },
  ],
};
