import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02FizzBuzzValue: Assignment = {
  id: "S3-Ch02-07-fizzbuzz-value",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 7,
  title: "FizzBuzz の 1 ステップを文字列で返す",
  newConcept: "複数条件の分岐結果を文字列で組み立てる",
  estimatedMinutes: 15,
  difficulty: 2,
  testKind: "function",
  description: `## やること

整数 \`n\` を受け取り、 以下のルールで文字列を返す関数 \`fizzBuzzValue\` を実装してください。

- \`n\` が **15 の倍数** なら \`"FizzBuzz"\`
- それ以外で **3 の倍数** なら \`"Fizz"\`
- それ以外で **5 の倍数** なら \`"Buzz"\`
- それ以外は **\`n\` を文字列にしたもの** (例: \`"1"\`, \`"7"\`)

\`\`\`js
fizzBuzzValue(1);   // → "1"
fizzBuzzValue(3);   // → "Fizz"
fizzBuzzValue(5);   // → "Buzz"
fizzBuzzValue(15);  // → "FizzBuzz"
fizzBuzzValue(30);  // → "FizzBuzz"
\`\`\`

## ポイント

- **15 の倍数 (= 3 と 5 の両方の倍数)** を最初に判定するのが定石です。
- 数値を文字列にするには \`String(n)\` を使います。
`,
  starterFiles: singleFile(`function fizzBuzzValue(n) {
  // ここを実装してください
}
`),
  entryPoints: ["fizzBuzzValue"],
  demoCall: `console.log(fizzBuzzValue(15));`,
  tests: [
    { name: 'fizzBuzzValue(1) は "1"', code: `fizzBuzzValue(1) === "1"` },
    { name: 'fizzBuzzValue(0) は "FizzBuzz"', code: `fizzBuzzValue(0) === "FizzBuzz"` },
    { name: 'fizzBuzzValue(3) は "Fizz"', code: `fizzBuzzValue(3) === "Fizz"` },
    { name: 'fizzBuzzValue(5) は "Buzz"', code: `fizzBuzzValue(5) === "Buzz"` },
    { name: 'fizzBuzzValue(15) は "FizzBuzz"', code: `fizzBuzzValue(15) === "FizzBuzz"` },
    { name: 'fizzBuzzValue(30) は "FizzBuzz"', code: `fizzBuzzValue(30) === "FizzBuzz"` },
    { name: 'fizzBuzzValue(45) は "FizzBuzz"', code: `fizzBuzzValue(45) === "FizzBuzz"` },
    { name: 'fizzBuzzValue(7) は "7"', code: `fizzBuzzValue(7) === "7"` },
    { name: 'fizzBuzzValue(9) は "Fizz"', code: `fizzBuzzValue(9) === "Fizz"` },
    { name: 'fizzBuzzValue(25) は "Buzz"', code: `fizzBuzzValue(25) === "Buzz"` },
  ],
  hints: [
    "判定順は **15 → 3 → 5 → その他** の順で行う。",
    "解答例:\n```js\nfunction fizzBuzzValue(n) {\n  if (n % 15 === 0) return \"FizzBuzz\";\n  if (n % 3 === 0) return \"Fizz\";\n  if (n % 5 === 0) return \"Buzz\";\n  return String(n);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function fizzBuzzValue(n) {
  if (n % 15 === 0) {
    return "FizzBuzz";
  }
  if (n % 3 === 0) {
    return "Fizz";
  }
  if (n % 5 === 0) {
    return "Buzz";
  }
  return String(n);
}
`,
  badSolutions: [
    {
      code: `function fizzBuzzValue(n) {
  if (n % 3 === 0) return "Fizz";
  if (n % 5 === 0) return "Buzz";
  if (n % 15 === 0) return "FizzBuzz";
  return String(n);
}
`,
      description: "判定順が逆で 15 のとき Fizz になってしまう",
    },
    {
      code: `function fizzBuzzValue(n) {
  return String(n);
}
`,
      description: "Fizz / Buzz 判定をしていない",
    },
  ],
  mdnSections: [
    {
      heading: "String()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/String",
      pageTitle: "String() コンストラクター",
    },
  ],
};
