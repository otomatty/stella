import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04IndexOf: Assignment = {
  id: "S2-Ch04-01-indexOf",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 1,
  title: "indexOf で要素の位置を求める",
  newConcept: "配列の indexOf は要素の添字を返す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

配列 \`["red", "green", "blue", "yellow"]\` で \`"blue"\` が **何番目** にあるか出力してください。

## 期待する出力

\`\`\`
2
\`\`\`

## ポイント

- \`arr.indexOf(値)\` で添字 (0 始まり) が返ります。
- 見つからないときは \`-1\`。
`,
  starterFiles: singleFile(`// 文字列の配列を const の変数に入れる


// その配列に対して indexOf で対象要素の添字を取得した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 2 になる",
      expectedStdout: "2",
    },
  ],
  hints: [
    "`colors.indexOf(\"blue\")` で添字が返ります。",
    "添字は 0 始まり: `red=0, green=1, blue=2`。",
    "解答例:\n```js\nconst colors = [\"red\", \"green\", \"blue\", \"yellow\"];\nconsole.log(colors.indexOf(\"blue\"));\n```",
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
  solution: `const colors = ["red", "green", "blue", "yellow"];
console.log(colors.indexOf("blue"));
`,
  badSolutions: [
    {
      code: `console.log(2);
`,
      description: "indexOf を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.indexOf()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf", pageTitle: "Array.prototype.indexOf()" },
  ],
};
