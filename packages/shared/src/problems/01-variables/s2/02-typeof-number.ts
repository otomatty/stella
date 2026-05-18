import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01TypeofNumber: Assignment = {
  id: "S2-Ch01-02-typeof-number",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 2,
  title: "typeof で数値の型を確認する",
  newConcept: "typeof 演算子で値の型を文字列として取り出す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const age = 30;\` で数値を宣言し、 \`typeof age\` の結果を \`console.log\` で出力してください。

## 期待する出力

\`\`\`
number
\`\`\`

## ポイント

- \`typeof 値\` は **値の型を文字列で返す** 演算子です。
- 数値の型は \`"number"\` という文字列で返されます。
`,
  starterFiles: singleFile(`// 数値を const の変数に入れる


// その変数の型を typeof 演算子で取り出し、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が number になる",
      expectedStdout: "number",
    },
  ],
  hints: [
    "`typeof` は関数ではなく演算子なので、 `typeof age` のように **括弧なし** でも書けます。",
    "出力するのは `age` ではなく `typeof age` の結果です。",
    "解答例:\n```js\nconst age = 30;\nconsole.log(typeof age);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "age",
          label: "const age を宣言する",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        {
          kind: "console-log",
          argument: { kind: "string", value: "number" },
          label: "答えを文字列リテラルで直接書かない",
        },
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "+" },
          label: "文字列連結 ('num' + 'ber') で答えを組み立てない",
        },
      ],
    },
  },
  solution: `const age = 30;
console.log(typeof age);
`,
  badSolutions: [
    {
      code: `console.log("number");
`,
      description: "typeof を使わずに答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "typeof", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/typeof", pageTitle: "typeof" },
  ],
};
