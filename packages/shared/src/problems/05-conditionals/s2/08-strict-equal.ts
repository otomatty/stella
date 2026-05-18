import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05StrictEqual: Assignment = {
  id: "S2-Ch05-08-strict-equal",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 8,
  title: "=== で厳密に等価比較する",
  newConcept: "=== は型と値の両方が一致したときだけ真",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const a = 1;\` と \`const b = "1";\` を **=== で比較** し、 結果を出力してください。 数値 \`1\` と文字列 \`"1"\` は同じ値に見えますが、 型が違うので \`===\` では一致しません。

## 期待する出力

\`\`\`
false
\`\`\`

## ポイント

- \`==\` (緩い等価) は型変換して比較するので \`1 == "1"\` は \`true\`。
- \`===\` (厳密等価) は型もチェックするので \`1 === "1"\` は \`false\`。
- 現代の JS では基本 \`===\` を使います (\`==\` は eslint の \`eqeqeq\` で禁止)。
- 答えを直接書く (例: \`console.log(false)\` や \`console.log("false")\`) のは NG。 必ず \`a === b\` の **比較式** を出力してください。
`,
  starterFiles: singleFile(`// 数値と、 同じ数字の文字列を、 それぞれ const の変数に入れる


// 2 つの変数を === で比較した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が false になる",
      expectedStdout: "false",
    },
  ],
  hints: [
    "`a === b` で比較します。",
    "`==` は使わないでください (lint がエラーを出します)。",
    "解答例:\n```js\nconst a = 1;\nconst b = \"1\";\nconsole.log(a === b);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "const-declaration", name: "a", label: "const a を宣言する" },
        { kind: "const-declaration", name: "b", label: "const b を宣言する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != は使わず === / !== を使う" },
        {
          kind: "console-log",
          argument: { kind: "string", value: "false" },
          label: "比較せず文字列を直接書かない",
        },
      ],
    },
  },
  solution: `const a = 1;
const b = "1";
console.log(a === b);
`,
  badSolutions: [
    {
      code: `const a = 1;
const b = "1";
console.log(a == b);
`,
      description: "== (緩い等価) を使っている (S2 では === に統一)",
    },
  ],
  mdnSections: [
    { heading: "等価演算子 (===)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Strict_equality", pageTitle: "厳密等価演算子 (===)" },
  ],
};
