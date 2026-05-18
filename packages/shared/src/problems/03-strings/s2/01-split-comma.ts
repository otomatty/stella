import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03SplitComma: Assignment = {
  id: "S2-Ch03-01-split-comma",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 1,
  title: "split で CSV を分割し配列を出力する",
  newConcept: "split は文字列を区切り文字で分けて配列にする",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

カンマ区切りの文字列 \`"apple,banana,cherry"\` を \`split(",")\` で分割し、 配列のまま \`console.log\` に渡してください。

## 期待する出力

\`\`\`
["apple","banana","cherry"]
\`\`\`

## ポイント

- \`"a,b,c".split(",")\` → \`["a","b","c"]\`
- 区切り文字を変えれば改行や空白でも分割できます。
`,
  starterFiles: singleFile(`// カンマ区切りの文字列を const の変数に入れる


// その変数に対して split を呼んで配列に分解し、 別の const の変数に入れる


// 分解した配列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が配列表現になる",
      expectedStdout: `["apple","banana","cherry"]`,
    },
  ],
  hints: [
    "`csv.split(\",\")` で配列が返ります。",
    "返り値の配列をそのまま `console.log` に渡します。",
    "解答例:\n```js\nconst csv = \"apple,banana,cherry\";\nconst items = csv.split(\",\");\nconsole.log(items);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "split", label: "split を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const csv = "apple,banana,cherry";
const items = csv.split(",");
console.log(items);
`,
  badSolutions: [
    {
      code: `console.log(["apple","banana","cherry"]);
`,
      description: "split を使わず配列を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.split()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/split", pageTitle: "String.prototype.split()" },
  ],
};
