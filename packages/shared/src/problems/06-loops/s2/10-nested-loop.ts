import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06NestedLoop: Assignment = {
  id: "S2-Ch06-10-nested-loop",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 10,
  title: "for ループで九九の 2 段を作る",
  newConcept: "ループを使って規則的な計算を繰り返す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

九九の **2 の段** を for ループで出力してください (2×1=2 ... 2×3=6 の 3 行)。

外側で行 (i=1..3)、 内側はなしで、 単に \`\` \`2x\${i}=\${2*i}\` \`\` を出力します。

## 期待する出力

\`\`\`
2x1=2
2x2=4
2x3=6
\`\`\`

## ポイント

- 単純な 1 重ループでもよいですが、 後の応用 (九九全体) を意識した形で書きます。
- テンプレートリテラルで埋め込みます。
`,
  starterFiles: singleFile(`// for ループでカウンタを 1 から上限まで回し、
// テンプレートリテラルで「2x...=...」 形式の文字列を組み立てて console.log で出力する

`),
  tests: [
    {
      name: "stdout が 2x1=2 / 2x2=4 / 2x3=6 の 3 行になる",
      expectedStdout: "2x1=2\n2x2=4\n2x3=6",
    },
  ],
  hints: [
    "`for (let i = 1; i <= 3; i++) { ... }` の中でテンプレートリテラル `\\`2x${i}=${2 * i}\\`` を出力します。",
    "テンプレートで `2 * i` の計算を埋め込みます。",
    "解答例:\n```js\nfor (let i = 1; i <= 3; i++) {\n  console.log(`2x${i}=${2 * i}`);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "TemplateLiteral", label: "テンプレートリテラルを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: "for (let i = 1; i <= 3; i++) {\n  console.log(`2x${i}=${2 * i}`);\n}\n",
  badSolutions: [
    {
      code: `console.log("2x1=2");
console.log("2x2=4");
console.log("2x3=6");
`,
      description: "ループを使わず 1 行ずつ出力している",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
