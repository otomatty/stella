import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03CountChar: Assignment = {
  id: "S3-Ch03-03-count-char",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 3,
  title: "特定の文字の出現回数を数える",
  newConcept: "for ループで文字列を 1 文字ずつ走査する",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

文字列 \`s\` と 1 文字 \`ch\` を受け取り、 \`s\` の中に \`ch\` が何回現れるかを返す関数 \`countChar\` を実装してください。

\`\`\`js
countChar("hello", "l");        // → 2
countChar("banana", "a");       // → 3
countChar("xyz", "a");          // → 0
countChar("", "a");             // → 0
\`\`\`

## ポイント

- \`for (let i = 0; i < s.length; i++)\` で 1 文字ずつ取り出して比較します。
- 文字の取り出しは \`s[i]\` または \`s.charAt(i)\` です。
- \`s.split(ch).length - 1\` という手もあります。
`,
  starterFiles: singleFile(`function countChar(s, ch) {
  // ここを実装してください
}
`),
  entryPoints: ["countChar"],
  demoCall: `console.log(countChar("banana", "a"));`,
  tests: [
    { name: 'countChar("hello", "l") は 2', code: `countChar("hello", "l") === 2` },
    { name: 'countChar("banana", "a") は 3', code: `countChar("banana", "a") === 3` },
    { name: 'countChar("xyz", "a") は 0', code: `countChar("xyz", "a") === 0` },
    { name: 'countChar("", "a") は 0', code: `countChar("", "a") === 0` },
    { name: 'countChar("aaaa", "a") は 4', code: `countChar("aaaa", "a") === 4` },
  ],
  hints: [
    "for ループで s[i] === ch を数える。",
    "解答例:\n```js\nfunction countChar(s, ch) {\n  let count = 0;\n  for (let i = 0; i < s.length; i++) {\n    if (s[i] === ch) count++;\n  }\n  return count;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で回数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function countChar(s, ch) {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ch) {
      count++;
    }
  }
  return count;
}
`,
  badSolutions: [
    {
      code: `function countChar(s, ch) {
  return s.length;
}
`,
      description: "文字列全体の長さを返している",
    },
    {
      code: `function countChar(s, ch) {
  return s.includes(ch) ? 1 : 0;
}
`,
      description: "includes は真偽しか分からないので回数が出ない",
    },
  ],
  mdnSections: [
    {
      heading: "文字列の各文字へのアクセス",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/charAt",
      pageTitle: "String.prototype.charAt()",
    },
  ],
};
