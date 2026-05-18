import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06FizzBuzzCapstone: Assignment = {
  id: "S2-Ch06-16-fizzbuzz-capstone",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 16,
  title: "[チャレンジ] FizzBuzz を実装する",
  newConcept: "S2 で習った for / if / 文字列を統合する",
  estimatedMinutes: 15,
  difficulty: 3,
  testKind: "stdout",
  isCapstone: true,
  description: `## やること

\`1\` から \`15\` までを for ループで巡り、 以下のルールで 1 行ずつ出力する **チャレンジ問題** (FizzBuzz) です。

- **15 の倍数 (3 と 5 の両方の倍数) のとき** \`"FizzBuzz"\`
- それ以外で **3 の倍数のとき** \`"Fizz"\`
- それ以外で **5 の倍数のとき** \`"Buzz"\`
- それ以外は **数字そのもの**

## 期待する出力

\`\`\`
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
\`\`\`

## ポイント

- **判定の順序が大事**: \`15 の倍数\` を最初にチェックしないと、 \`3 の倍数\` で先に Fizz を出力してしまいます。
- if/else if/else で書きます。
- **ハードコード禁止**: ループや if を使わず 15 行分の文字列を 1 つの \`console.log\` で出力するのは NG。 必ず for ループと条件分岐で計算してください。
`,
  starterFiles: singleFile(`// for ループでカウンタを 1 から上限まで回す


// 各回ごとに、 説明文の優先順 (両方の倍数 → 一方の倍数 → どちらでもない) で
// if / else if / else に分岐し、 対応する文字列または数値を console.log で出力する
// (両方の倍数を最初にチェックしないと判定が崩れる点に注意)

`),
  tests: [
    {
      name: "stdout が FizzBuzz の 15 行になる",
      expectedStdout: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
    },
  ],
  hints: [
    "`for (let i = 1; i <= 15; i++) { ... }` で 1〜15 を巡ります。",
    "判定は **15 の倍数を最初** にしないと Fizz / Buzz が先に出てしまいます。",
    "解答例:\n```js\nfor (let i = 1; i <= 15; i++) {\n  if (i % 15 === 0) {\n    console.log(\"FizzBuzz\");\n  } else if (i % 3 === 0) {\n    console.log(\"Fizz\");\n  } else if (i % 5 === 0) {\n    console.log(\"Buzz\");\n  } else {\n    console.log(i);\n  }\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "IfStatement", label: "if 文で分岐する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `for (let i = 1; i <= 15; i++) {
  if (i % 15 === 0) {
    console.log("FizzBuzz");
  } else if (i % 3 === 0) {
    console.log("Fizz");
  } else if (i % 5 === 0) {
    console.log("Buzz");
  } else {
    console.log(i);
  }
}
`,
  badSolutions: [
    {
      code: `for (let i = 1; i <= 15; i++) {
  if (i % 3 === 0) {
    console.log("Fizz");
  } else if (i % 5 === 0) {
    console.log("Buzz");
  } else if (i % 15 === 0) {
    console.log("FizzBuzz");
  } else {
    console.log(i);
  }
}
`,
      description: "判定順が間違っている (15 の倍数を後ろにしている)",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
    { heading: "剰余 (%)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Remainder", pageTitle: "剰余 (%)" },
  ],
};
