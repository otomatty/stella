import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07FunctionGreet: Assignment = {
  id: "S2-Ch07-01-function-greet",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 1,
  title: "function 宣言で挨拶関数を作る",
  newConcept: "function 宣言の基本形 (引数なし・戻り値なし)",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`function greet()\` という関数を **宣言** し、 中で \`console.log("こんにちは")\` を呼びます。 そのあと \`greet()\` を **呼び出して** メッセージを表示させてください。

## 期待する出力

\`\`\`
こんにちは
\`\`\`

## ポイント

- \`function 名前() { ... }\` で関数を **宣言** します。
- 関数は宣言しただけでは実行されません。 \`greet()\` のように呼ばないと中身は動きません。
`,
  starterFiles: singleFile(`// 引数を取らない function 文で関数を宣言し、 中で console.log で文字列を出力する


// 宣言した関数を呼び出す

`),
  tests: [
    {
      name: "stdout が こんにちは になる",
      expectedStdout: "こんにちは",
    },
  ],
  hints: [
    "`function greet() { ... }` で宣言します。",
    "宣言の後に `greet();` を書いて呼び出します。",
    "解答例:\n```js\nfunction greet() {\n  console.log(\"こんにちは\");\n}\ngreet();\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function greet() {
  console.log("こんにちは");
}
greet();
`,
  badSolutions: [
    {
      code: `console.log("こんにちは");
`,
      description: "関数を作らず直接 console.log している",
    },
    {
      code: `function greet() {
  console.log("こんにちは");
}
`,
      description: "関数を呼び出していない",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
  ],
};
