import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03SplitJoin: Assignment = {
  id: "S2-Ch03-02-split-join",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 2,
  title: "split と join で区切り文字を入れ替える",
  newConcept: "split で分割して join で結合し直す",
  estimatedMinutes: 7,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`"2024-01-15"\` のハイフン区切り文字列を、 **スラッシュ区切り** \`"2024/01/15"\` に変換して出力してください。

\`split("-")\` で配列にしてから \`join("/")\` で結合します。

## 期待する出力

\`\`\`
2024/01/15
\`\`\`

## ポイント

- \`split\` で配列に → \`join\` で文字列に戻すと **区切り文字の入れ替え** ができます。
- \`replaceAll\` でも実現できますが、 配列を経由するこの組み合わせは応用範囲が広いです。
`,
  starterFiles: singleFile(`// ハイフン区切りの日付文字列を const の変数に入れる


// その変数を split で配列に分解し、 別の const の変数に入れる


// 分解した配列を join で別の区切り文字に繋ぎ直し、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が 2024/01/15 になる",
      expectedStdout: "2024/01/15",
    },
  ],
  hints: [
    "`date.split(\"-\")` で `[\"2024\",\"01\",\"15\"]`。",
    "`parts.join(\"/\")` で `\"2024/01/15\"` に戻せます。",
    "解答例:\n```js\nconst date = \"2024-01-15\";\nconst parts = date.split(\"-\");\nconsole.log(parts.join(\"/\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "split", label: "split を使う" },
        { kind: "method", name: "join", label: "join を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const date = "2024-01-15";
const parts = date.split("-");
console.log(parts.join("/"));
`,
  badSolutions: [
    {
      code: `console.log("2024/01/15");
`,
      description: "split/join を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.split()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/split", pageTitle: "String.prototype.split()" },
    { heading: "Array.prototype.join()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/join", pageTitle: "Array.prototype.join()" },
  ],
};
