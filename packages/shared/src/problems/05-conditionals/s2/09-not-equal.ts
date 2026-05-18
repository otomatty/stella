import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05NotEqual: Assignment = {
  id: "S2-Ch05-09-not-equal",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 9,
  title: "!== で不一致を判定する",
  newConcept: "!== は型と値のどちらかが違えば真",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const status = "error";\` が \`"ok"\` と **違うかどうか** を \`!==\` で判定し、 真なら \`"異常終了"\` を出力してください。

## 期待する出力

\`\`\`
異常終了
\`\`\`

## ポイント

- \`!==\` は厳密不等価。 \`===\` の反対です。
- \`!=\` (緩い不等価) は型変換するので **避けます**。
`,
  starterFiles: singleFile(`// ステータスの文字列を const の変数に入れる


// その変数を !== で「ok」 と比較した条件の if で文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 異常終了 になる",
      expectedStdout: "異常終了",
    },
  ],
  hints: [
    "`status !== \"ok\"` で「ok ではない」 を判定します。",
    "`if (条件) { ... }` で実行します。",
    "解答例:\n```js\nconst status = \"error\";\nif (status !== \"ok\") {\n  console.log(\"異常終了\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != は使わず === / !== を使う" },
      ],
    },
  },
  solution: `const status = "error";
if (status !== "ok") {
  console.log("異常終了");
}
`,
  badSolutions: [
    {
      code: `console.log("異常終了");
`,
      description: "条件を書かず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "厳密不等価 (!==)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Strict_inequality", pageTitle: "厳密不等価 (!==)" },
  ],
};
