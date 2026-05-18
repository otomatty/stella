import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01TypeofString: Assignment = {
  id: "S2-Ch01-03-typeof-string",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 3,
  title: "typeof で文字列の型を確認する",
  newConcept: "文字列の型は 'string' という文字列で返る",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const name = "Taro";\` を宣言し、 \`typeof name\` の結果を出力してください。

## 期待する出力

\`\`\`
string
\`\`\`

## ポイント

- 文字列の \`typeof\` は \`"string"\` です。
- \`typeof\` は直接値にも使えますが、 この問題では \`const name\` を宣言して \`typeof name\` を使います。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// その変数の型を typeof 演算子で取り出し、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が string になる",
      expectedStdout: "string",
    },
  ],
  hints: [
    "値が文字列なら、 `typeof` は `\"string\"` を返します。",
    "`typeof name` の結果を `console.log` に渡します。",
    "解答例:\n```js\nconst name = \"Taro\";\nconsole.log(typeof name);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "name",
          label: "const name を宣言する",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        {
          kind: "console-log",
          argument: { kind: "string", value: "string" },
          label: "答えを文字列リテラルで直接書かない",
        },
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "+" },
          label: "文字列連結で答えを組み立てない",
        },
      ],
    },
  },
  solution: `const name = "Taro";
console.log(typeof name);
`,
  badSolutions: [
    {
      code: `console.log("string");
`,
      description: "typeof を使わずに答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "typeof", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/typeof", pageTitle: "typeof" },
  ],
};
