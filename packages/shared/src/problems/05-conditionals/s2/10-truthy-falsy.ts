import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05TruthyFalsy: Assignment = {
  id: "S2-Ch05-10-truthy-falsy",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 10,
  title: "空文字列は falsy",
  newConcept: "空文字 / 0 / null / undefined は if で false 扱い",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const name = "";\` のとき、 \`if (name)\` は **falsy** (= false 扱い) なので else に入ります。 これを利用して

- \`name\` が空文字でなければ \`name\` をそのまま出力
- 空文字なら \`"名無し"\` を出力

を実装してください。

## 期待する出力

\`\`\`
名無し
\`\`\`

## ポイント

- JavaScript で **falsy** な値: \`false\` / \`0\` / \`""\` / \`null\` / \`undefined\` / \`NaN\`
- これら以外はすべて **truthy** で \`if\` の条件で真になります。
`,
  starterFiles: singleFile(`// 文字列 (空文字列) を const の変数に入れる


// その変数をそのまま条件にした if / else で、 真偽それぞれの場合の値を console.log で出力する
// (空文字列は falsy として扱われる)

`),
  tests: [
    {
      name: "stdout が 名無し になる",
      expectedStdout: "名無し",
    },
  ],
  hints: [
    "`if (name)` だけで「name が空でないか」 を判定できます。",
    "空のときは else に入って `\"名無し\"` を出力します。",
    "解答例:\n```js\nconst name = \"\";\nif (name) {\n  console.log(name);\n} else {\n  console.log(\"名無し\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const name = "";
if (name) {
  console.log(name);
} else {
  console.log("名無し");
}
`,
  badSolutions: [
    {
      code: `console.log("名無し");
`,
      description: "条件を書かず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "Falsy", pageUrl: "https://developer.mozilla.org/ja/docs/Glossary/Falsy", pageTitle: "Falsy" },
  ],
};
