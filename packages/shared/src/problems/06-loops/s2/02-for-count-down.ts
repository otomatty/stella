import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06ForCountDown: Assignment = {
  id: "S2-Ch06-02-for-count-down",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 2,
  title: "for で 5 から 1 まで降順に出す",
  newConcept: "i-- や i >= 1 で逆方向にループする",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`for\` ループで \`5\` から \`1\` まで降順で 1 行ずつ出力してください。

## 期待する出力

\`\`\`
5
4
3
2
1
\`\`\`

## ポイント

- \`for (let i = 5; i >= 1; i--) { ... }\` のように初期値・条件・更新を逆向きにします。
- \`i--\` は \`i = i - 1\` の省略形。
`,
  starterFiles: singleFile(`// for ループでカウンタ変数を上限から始めて、 1 まで 1 ずつ減らしながら毎回 console.log で出力する

`),
  tests: [
    {
      name: "stdout が 5-1 の 5 行になる",
      expectedStdout: "5\n4\n3\n2\n1",
    },
  ],
  hints: [
    "初期値を `5`、 条件を `i >= 1`、 更新を `i--` にします。",
    "中で `console.log(i);` を呼びます。",
    "解答例:\n```js\nfor (let i = 5; i >= 1; i--) {\n  console.log(i);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `for (let i = 5; i >= 1; i--) {
  console.log(i);
}
`,
  badSolutions: [
    {
      code: `console.log(5);
console.log(4);
console.log(3);
console.log(2);
console.log(1);
`,
      description: "for を使わず 1 行ずつ console.log している",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
