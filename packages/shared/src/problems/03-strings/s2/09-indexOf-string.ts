import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03IndexOfString: Assignment = {
  id: "S2-Ch03-09-indexOf-string",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 9,
  title: "indexOf で部分文字列の位置を求める",
  newConcept: "indexOf は最初に見つかった位置 (0 始まり) を返す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"Hello, World!"\` の中で \`"World"\` が始まる位置 (添字) を求めて出力してください。

## 期待する出力

\`\`\`
7
\`\`\`

## ポイント

- \`"Hello, World!".indexOf("World")\` → \`7\` (W が 7 番目)
- 見つからないときは \`-1\` を返します。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// その変数に対して indexOf で部分文字列の出現位置を取得した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 7 になる",
      expectedStdout: "7",
    },
  ],
  hints: [
    "`text.indexOf(\"World\")` で位置が返ります。",
    "添字は **0 始まり** であることに注意。 `H=0, e=1, l=2, l=3, o=4, ,=5, _=6, W=7`。",
    "解答例:\n```js\nconst text = \"Hello, World!\";\nconsole.log(text.indexOf(\"World\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "indexOf", label: "indexOf を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const text = "Hello, World!";
console.log(text.indexOf("World"));
`,
  badSolutions: [
    {
      code: `console.log(7);
`,
      description: "indexOf を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.indexOf()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf", pageTitle: "String.prototype.indexOf()" },
  ],
};
