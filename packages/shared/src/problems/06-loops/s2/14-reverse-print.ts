import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06ReversePrint: Assignment = {
  id: "S2-Ch06-14-reverse-print",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 14,
  title: "for で配列を逆順に出す",
  newConcept: "末尾から先頭へ向けて添字を減らしながらアクセス",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

配列 \`["one", "two", "three"]\` を for ループで **逆順** に 1 行ずつ出力してください。

## 期待する出力

\`\`\`
three
two
one
\`\`\`

## ポイント

- 末尾の添字 \`arr.length - 1\` から開始し、 \`i >= 0\` の間、 \`i--\` で減らします。
- 配列自体は **変更しません**。
`,
  starterFiles: singleFile(`// 文字列の配列を const の変数に入れる


// for ループで添字 length - 1 から 0 まで 1 ずつ減らしながら、 各要素を console.log で出力する

`),
  tests: [
    {
      name: "stdout が three/two/one の 3 行になる",
      expectedStdout: "three\ntwo\none",
    },
  ],
  hints: [
    "初期値 `items.length - 1`、 条件 `i >= 0`、 更新 `i--`。",
    "中で `console.log(items[i]);` を呼びます。",
    "解答例:\n```js\nconst items = [\"one\", \"two\", \"three\"];\nfor (let i = items.length - 1; i >= 0; i--) {\n  console.log(items[i]);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reverse", label: "reverse は使わない (ループで実装する)" },
      ],
    },
  },
  solution: `const items = ["one", "two", "three"];
for (let i = items.length - 1; i >= 0; i--) {
  console.log(items[i]);
}
`,
  badSolutions: [
    {
      code: `console.log("three");
console.log("two");
console.log("one");
`,
      description: "ループを使わず 1 行ずつ出力している",
    },
    {
      code: `const items = ["one", "two", "three"];
items.reverse();
for (let i = 0; i < items.length; i++) {
  console.log(items[i]);
}
`,
      description: "reverse を使っている (ループの方向だけで実装すること)",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
