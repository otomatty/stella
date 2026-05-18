import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04Pop: Assignment = {
  id: "S1-Ch04-05-pop",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 5,
  title: "pop で末尾の要素を取り除く",
  newConcept: "配列.pop() で末尾の要素を取り除く",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`["x", "y", "z"]\` を \`items\` に入れ、 \`pop()\` で **末尾の要素を取り除いて** から \`items\` を出力してください。

## 期待する出力

\`\`\`
["x","y"]
\`\`\`
`,
  starterFiles: singleFile(`// 配列を const の変数に入れる


// 末尾の要素を pop で取り除く


// 取り除いたあとの配列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [\"x\",\"y\"] になる",
      expectedStdout: '["x","y"]',
    },
  ],
  hints: [
    "末尾の要素を取り除くのは `items.pop()`。",
    "pop は元の配列を変更し、 取り除いた要素を返します。 ここでは戻り値は使いません。",
    "解答例:\n```js\nconst items = [\"x\", \"y\", \"z\"];\nitems.pop();\nconsole.log(items);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "pop", label: "pop を呼ぶ" },
      ],
    },
  },
  solution: `const items = ["x", "y", "z"];
items.pop();
console.log(items);
`,
};
