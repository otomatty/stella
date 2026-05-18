import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03IsPalindrome: Assignment = {
  id: "S3-Ch03-02-is-palindrome",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 2,
  title: "回文判定",
  newConcept: "前から読んでも後ろから読んでも同じか調べる",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

文字列 \`s\` を受け取り、 回文 (前から読んでも後ろから読んでも同じ) なら \`true\`、 そうでなければ \`false\` を返す関数 \`isPalindrome\` を実装してください。 大文字小文字は **区別する** ものとします。

\`\`\`js
isPalindrome("aba");    // → true
isPalindrome("racecar");// → true
isPalindrome("hello");  // → false
isPalindrome("a");      // → true
isPalindrome("");       // → true   (空文字列は回文扱い)
\`\`\`

## ポイント

- 反転した文字列が元と同じかを比較するのが一番素直です。
- \`s.split("").reverse().join("") === s\` でほぼ 1 行。
`,
  starterFiles: singleFile(`function isPalindrome(s) {
  // ここを実装してください
}
`),
  entryPoints: ["isPalindrome"],
  demoCall: `console.log(isPalindrome("racecar"));`,
  tests: [
    { name: 'isPalindrome("aba") は true', code: `isPalindrome("aba") === true` },
    { name: 'isPalindrome("racecar") は true', code: `isPalindrome("racecar") === true` },
    { name: 'isPalindrome("hello") は false', code: `isPalindrome("hello") === false` },
    { name: 'isPalindrome("a") は true', code: `isPalindrome("a") === true` },
    { name: 'isPalindrome("") は true', code: `isPalindrome("") === true` },
    { name: 'isPalindrome("ab") は false', code: `isPalindrome("ab") === false` },
    {
      name: 'isPalindrome("Aa") は false (大文字小文字を区別する)',
      code: `isPalindrome("Aa") === false`,
    },
  ],
  hints: [
    "反転した文字列と元を比較。",
    "解答例:\n```js\nfunction isPalindrome(s) {\n  return s.split(\"\").reverse().join(\"\") === s;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function isPalindrome(s) {
  return s.split("").reverse().join("") === s;
}
`,
  badSolutions: [
    {
      code: `function isPalindrome(s) {
  return true;
}
`,
      description: "常に true を返している",
    },
    {
      code: `function isPalindrome(s) {
  return s === s.toUpperCase();
}
`,
      description: "回文判定ではなく大文字判定をしている",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reverse()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse",
      pageTitle: "Array.prototype.reverse()",
    },
  ],
};
