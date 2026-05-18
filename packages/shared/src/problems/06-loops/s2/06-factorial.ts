import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06Factorial: Assignment = {
  id: "S2-Ch06-06-factorial",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 6,
  title: "for で 5! を計算する",
  newConcept: "累積積 (掛け算の累積) もループで書ける",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`5\` の階乗 (5 × 4 × 3 × 2 × 1) を for ループで計算し、 結果を出力してください。

## 期待する出力

\`\`\`
120
\`\`\`

## ポイント

- 累積積では **初期値を 1** にします (0 にすると常に 0)。
- ループの中で \`result *= i;\` を繰り返します。
`,
  starterFiles: singleFile(`// 結果を入れる let の変数を 1 で初期化する


// for ループで 1 から上限まで回し、 *= で値を掛け込む


// 結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 120 になる",
      expectedStdout: "120",
    },
  ],
  hints: [
    "`let result = 1;` で初期化 (0 にしないこと)。",
    "`for (let i = 1; i <= 5; i++) { result *= i; }`。",
    "解答例:\n```js\nlet result = 1;\nfor (let i = 1; i <= 5; i++) {\n  result *= i;\n}\nconsole.log(result);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 120 }, label: "計算せず答えを直接出力しない" },
      ],
    },
  },
  solution: `let result = 1;
for (let i = 1; i <= 5; i++) {
  result *= i;
}
console.log(result);
`,
  badSolutions: [
    {
      code: `console.log(120);
`,
      description: "ループを使わず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
