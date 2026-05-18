import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01TypeofBoolean: Assignment = {
  id: "S2-Ch01-04-typeof-boolean",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 4,
  title: "typeof で真偽値の型を確認する",
  newConcept: "boolean (true / false) の型は 'boolean'",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const isActive = true;\` を宣言し、 \`typeof isActive\` の結果を出力してください。

## 期待する出力

\`\`\`
boolean
\`\`\`

## ポイント

- \`true\` / \`false\` の型は \`"boolean"\` です。
- 後の章で出てくる条件分岐 (\`if\`) では boolean 値を使います。
`,
  starterFiles: singleFile(`// boolean 値 (true / false) を const の変数に入れる


// その変数の型を typeof 演算子で取り出し、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が boolean になる",
      expectedStdout: "boolean",
    },
  ],
  hints: [
    "boolean は **2 つしか値がない型** です: `true` と `false`。",
    "`typeof isActive` の結果を `console.log` に渡します。",
    "解答例:\n```js\nconst isActive = true;\nconsole.log(typeof isActive);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "isActive",
          label: "const isActive を宣言する",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        {
          kind: "console-log",
          argument: { kind: "string", value: "boolean" },
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
  solution: `const isActive = true;
console.log(typeof isActive);
`,
  badSolutions: [
    {
      code: `console.log("boolean");
`,
      description: "typeof を使わずに答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "typeof", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/typeof", pageTitle: "typeof" },
  ],
};
