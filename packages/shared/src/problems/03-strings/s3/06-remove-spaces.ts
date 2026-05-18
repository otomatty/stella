import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03RemoveSpaces: Assignment = {
  id: "S3-Ch03-06-remove-spaces",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 6,
  title: "文字列からスペースを全て削除する",
  newConcept: "split + join もしくは replaceAll で文字を全置換",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

文字列 \`s\` を受け取り、 半角スペース \`" "\` をすべて削除した文字列を返す関数 \`removeSpaces\` を実装してください。

\`\`\`js
removeSpaces("hello world");   // → "helloworld"
removeSpaces("  a b c  ");     // → "abc"
removeSpaces("nospace");       // → "nospace"
removeSpaces("");              // → ""
\`\`\`

## ポイント

- \`s.split(" ").join("")\` で全スペースを削除できます。
- \`s.replaceAll(" ", "")\` でも同じ結果です。
`,
  starterFiles: singleFile(`function removeSpaces(s) {
  // ここを実装してください
}
`),
  entryPoints: ["removeSpaces"],
  demoCall: `console.log(removeSpaces("  a b c  "));`,
  tests: [
    { name: 'removeSpaces("hello world") は "helloworld"', code: `removeSpaces("hello world") === "helloworld"` },
    { name: 'removeSpaces("  a b c  ") は "abc"', code: `removeSpaces("  a b c  ") === "abc"` },
    { name: 'removeSpaces("nospace") は "nospace"', code: `removeSpaces("nospace") === "nospace"` },
    { name: 'removeSpaces("") は ""', code: `removeSpaces("") === ""` },
    { name: 'removeSpaces("   ") は ""', code: `removeSpaces("   ") === ""` },
  ],
  hints: [
    "split + join、 もしくは replaceAll の一発技。",
    "解答例:\n```js\nfunction removeSpaces(s) {\n  return s.split(\" \").join(\"\");\n}\n```",
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
  solution: `function removeSpaces(s) {
  return s.split(" ").join("");
}
`,
  badSolutions: [
    {
      code: `function removeSpaces(s) {
  return s.trim();
}
`,
      description: "trim は前後の空白だけ。 中央のスペースが残る",
    },
    {
      code: `function removeSpaces(s) {
  return s.replace(" ", "");
}
`,
      description: "replace は最初の 1 個しか消えない",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.replaceAll()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll",
      pageTitle: "String.prototype.replaceAll()",
    },
  ],
};
