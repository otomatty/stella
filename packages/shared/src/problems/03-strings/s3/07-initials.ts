import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03Initials: Assignment = {
  id: "S3-Ch03-07-initials",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 7,
  title: "氏名からイニシャルを作る",
  newConcept: "split で単語分割し、 先頭文字を集めて連結する",
  estimatedMinutes: 15,
  difficulty: 2,
  testKind: "function",
  description: `## やること

スペース区切りの氏名 \`fullName\` を受け取り、 各単語の **先頭文字を大文字** にしてつなげたイニシャルを返す関数 \`initials\` を実装してください。

\`\`\`js
initials("alice jane brown");  // → "AJB"
initials("john smith");        // → "JS"
initials("madonna");           // → "M"
initials("");                  // → ""
\`\`\`

## ポイント

- \`split(" ")\` で単語配列にする。
- 各単語の先頭 \`word[0]\` を大文字化して集める。
- 空文字列のときは split の結果が \`[""]\` になることに注意。
`,
  starterFiles: singleFile(`function initials(fullName) {
  // ここを実装してください
}
`),
  entryPoints: ["initials"],
  demoCall: `console.log(initials("alice jane brown"));`,
  tests: [
    { name: 'initials("alice jane brown") は "AJB"', code: `initials("alice jane brown") === "AJB"` },
    { name: 'initials("john smith") は "JS"', code: `initials("john smith") === "JS"` },
    { name: 'initials("madonna") は "M"', code: `initials("madonna") === "M"` },
    { name: 'initials("") は ""', code: `initials("") === ""` },
    { name: 'initials("ALICE jane") は "AJ"', code: `initials("ALICE jane") === "AJ"` },
  ],
  hints: [
    "空文字列のときは特別扱いするのが安全。",
    "解答例:\n```js\nfunction initials(fullName) {\n  if (fullName.length === 0) return \"\";\n  const words = fullName.split(\" \");\n  let result = \"\";\n  for (const w of words) {\n    if (w.length > 0) result += w[0].toUpperCase();\n  }\n  return result;\n}\n```",
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
  solution: `function initials(fullName) {
  if (fullName.length === 0) {
    return "";
  }
  const words = fullName.split(" ");
  let result = "";
  for (const w of words) {
    if (w.length > 0) {
      result += w[0].toUpperCase();
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function initials(fullName) {
  return fullName[0].toUpperCase();
}
`,
      description: "最初の単語の頭文字しか取れていない",
    },
    {
      code: `function initials(fullName) {
  return fullName.toUpperCase();
}
`,
      description: "全部を大文字化しているだけ",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.split()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/split",
      pageTitle: "String.prototype.split()",
    },
  ],
};
