import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04Push: Assignment = {
  id: "S1-Ch04-04-push",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 4,
  title: "push で末尾に要素を追加する",
  newConcept: "配列.push(値) で配列の末尾に要素を追加する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`["a", "b"]\` を \`items\` に入れ、 \`push\` で \`"c"\` を **末尾に追加** してから \`items\` を出力してください。

## 期待する出力

\`\`\`
["a","b","c"]
\`\`\`

## ポイント

- \`配列.push(値)\` は配列の末尾に値を追加します。
- 元の配列が **変更されます** (push は新しい配列を返さない)。 const で宣言していても push できます (中身を入れ替えるだけなので)。
`,
  starterFiles: singleFile(`// 配列を const の変数に入れる


// 末尾に新しい要素を push で追加する


// 追加後の配列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [\"a\",\"b\",\"c\"] になる",
      expectedStdout: '["a","b","c"]',
    },
  ],
  hints: [
    "末尾追加は `items.push(\"c\")`。",
    "push は元の配列を変更します。 push したあとに `console.log(items)` で配列を出します。",
    "解答例:\n```js\nconst items = [\"a\", \"b\"];\nitems.push(\"c\");\nconsole.log(items);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "push", label: "push を呼ぶ" },
      ],
    },
  },
  solution: `const items = ["a", "b"];
items.push("c");
console.log(items);
`,
  badSolutions: [
    {
      code: `const items = ["a", "b", "c"];
console.log(items);
`,
      description: "push を使わずに最初から完成形の配列を作っている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.push()" },
  ],
};
