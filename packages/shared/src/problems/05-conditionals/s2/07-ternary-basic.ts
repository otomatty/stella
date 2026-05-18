import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05TernaryBasic: Assignment = {
  id: "S2-Ch05-07-ternary-basic",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 7,
  title: "三項演算子で短く分岐する",
  newConcept: "条件 ? 真の値 : 偽の値 で値を選ぶ",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const age = 20;\` に対して、 三項演算子 \`age >= 18 ? "大人" : "未成年"\` で文字列を選び、 出力してください。

## 期待する出力

\`\`\`
大人
\`\`\`

## ポイント

- \`条件 ? 真のときの値 : 偽のときの値\` で **値を選ぶ** 式が書けます。
- \`if/else\` を文ではなく **式** として書けるので、 変数代入と相性が良いです。
`,
  starterFiles: singleFile(`// 年齢の数値を const の変数に入れる


// 三項演算子 ( 条件 ? 真の値 : 偽の値 ) で対応する文字列を選び、 別の const の変数に入れる


// 結果の変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 大人 になる",
      expectedStdout: "大人",
    },
  ],
  hints: [
    "`age >= 18 ? \"大人\" : \"未成年\"` で値が決まります。",
    "決まった値を `console.log` に渡します。",
    "解答例:\n```js\nconst age = 20;\nconst label = age >= 18 ? \"大人\" : \"未成年\";\nconsole.log(label);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ConditionalExpression", label: "三項演算子を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const age = 20;
const label = age >= 18 ? "大人" : "未成年";
console.log(label);
`,
  badSolutions: [
    {
      code: `console.log("大人");
`,
      description: "三項演算子を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "条件 (三項) 演算子", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Conditional_operator", pageTitle: "条件 (三項) 演算子" },
  ],
};
