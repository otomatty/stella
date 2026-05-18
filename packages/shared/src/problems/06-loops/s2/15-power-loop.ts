import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06PowerLoop: Assignment = {
  id: "S2-Ch06-15-power-loop",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 15,
  title: "for で 2 の 8 乗を計算する",
  newConcept: "Math.pow を使わずにループで累乗を求める",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`Math.pow\` を **使わずに** for ループで \`2\` の \`8\` 乗を計算し、 結果を出力してください。

## 期待する出力

\`\`\`
256
\`\`\`

## ポイント

- \`let result = 1;\` で初期化し、 8 回 \`result *= 2;\` を繰り返します。
- ループの仕組みを理解するための練習なので Math.pow は禁止です。
`,
  starterFiles: singleFile(`// 結果を入れる let の変数を 1 で初期化する


// for ループで指定回数だけ回し、 *= で底の値を掛け込む


// 結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 256 になる",
      expectedStdout: "256",
    },
  ],
  hints: [
    "`let result = 1;` で初期化。 8 回 `result *= 2;` を繰り返します。",
    "ループ後に `console.log(result);`。",
    "解答例:\n```js\nlet result = 1;\nfor (let i = 0; i < 8; i++) {\n  result *= 2;\n}\nconsole.log(result);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "pow", label: "Math.pow は使わない" },
        { kind: "console-log", argument: { kind: "number", value: 256 }, label: "計算せず答えを直接出力しない" },
      ],
    },
  },
  solution: `let result = 1;
for (let i = 0; i < 8; i++) {
  result *= 2;
}
console.log(result);
`,
  badSolutions: [
    {
      code: `console.log(256);
`,
      description: "ループを使わず答えを直接書いている",
    },
    {
      code: `console.log(Math.pow(2, 8));
`,
      description: "Math.pow を使っている (ループで実装すること)",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
