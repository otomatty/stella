import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03Repeat: Assignment = {
  id: "S2-Ch03-11-repeat",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 11,
  title: "repeat で文字列を繰り返す",
  newConcept: "repeat(n) は同じ文字列を n 回繰り返した結果を返す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"ab"\` を \`5\` 回繰り返した \`"ababababab"\` を \`repeat\` で作って出力してください。

## 期待する出力

\`\`\`
ababababab
\`\`\`

## ポイント

- \`"ab".repeat(5)\` → \`"ababababab"\`
- 区切り線 (\`"-".repeat(20)\`) などで便利です。
`,
  starterFiles: singleFile(`// 元になる文字列を const の変数に入れる


// その変数に対して repeat を呼んで指定回数くり返した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が ababababab になる",
      expectedStdout: "ababababab",
    },
  ],
  hints: [
    "`base.repeat(5)` で 5 回繰り返した文字列が返ります。",
    "戻り値を `console.log` に渡します。",
    "解答例:\n```js\nconst base = \"ab\";\nconsole.log(base.repeat(5));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "repeat", label: "repeat を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const base = "ab";
console.log(base.repeat(5));
`,
  badSolutions: [
    {
      code: `console.log("ababababab");
`,
      description: "repeat を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.repeat()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/repeat", pageTitle: "String.prototype.repeat()" },
  ],
};
