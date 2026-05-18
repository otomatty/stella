import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch06RepeatJoin: Assignment = {
  id: "S3-Ch06-04-repeat-join",
  stage: "S3",
  chapterId: "Ch06",
  sequence: 4,
  title: "文字列を区切り文字を挟んで n 回繰り返す",
  newConcept: "ループで区切り文字を間に挟む処理",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

文字列 \`text\`、 回数 \`n\` (\`>=0\` の整数)、 区切り文字 \`sep\` を受け取り、 \`text\` を \`n\` 回 \`sep\` で繋いだ文字列を返す関数 \`repeatJoin\` を実装してください。

\`\`\`js
repeatJoin("ab", 3, "-");   // → "ab-ab-ab"
repeatJoin("x", 5, "");     // → "xxxxx"
repeatJoin("hi", 1, "-");   // → "hi"
repeatJoin("hi", 0, "-");   // → ""
\`\`\`

## ポイント

- 配列に \`n\` 個 \`text\` を入れて \`join(sep)\` するのが一番素直です。
- \`String.prototype.repeat\` で空 join するのは \`sep === ""\` のときだけ使えます。
- \`n === 0\` のとき空文字列を返すのを忘れずに。
`,
  starterFiles: singleFile(`function repeatJoin(text, n, sep) {
  // ここを実装してください
}
`),
  entryPoints: ["repeatJoin"],
  demoCall: `console.log(repeatJoin("ab", 3, "-"));`,
  tests: [
    { name: 'repeatJoin("ab", 3, "-") は "ab-ab-ab"', code: `repeatJoin("ab", 3, "-") === "ab-ab-ab"` },
    { name: 'repeatJoin("x", 5, "") は "xxxxx"', code: `repeatJoin("x", 5, "") === "xxxxx"` },
    { name: 'repeatJoin("hi", 1, "-") は "hi"', code: `repeatJoin("hi", 1, "-") === "hi"` },
    { name: 'repeatJoin("hi", 0, "-") は ""', code: `repeatJoin("hi", 0, "-") === ""` },
    { name: 'repeatJoin("a", 4, ",") は "a,a,a,a"', code: `repeatJoin("a", 4, ",") === "a,a,a,a"` },
  ],
  hints: [
    "配列に push してから join。",
    "解答例:\n```js\nfunction repeatJoin(text, n, sep) {\n  const parts = [];\n  for (let i = 0; i < n; i++) {\n    parts.push(text);\n  }\n  return parts.join(sep);\n}\n```",
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
  solution: `function repeatJoin(text, n, sep) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    parts.push(text);
  }
  return parts.join(sep);
}
`,
  badSolutions: [
    {
      code: `function repeatJoin(text, n, sep) {
  let result = "";
  for (let i = 0; i < n; i++) {
    result += text + sep;
  }
  return result;
}
`,
      description: "末尾に区切り文字が余分につく (ab-ab-ab- になる)",
    },
    {
      code: `function repeatJoin(text, n, sep) {
  return text.repeat(n);
}
`,
      description: "区切り文字を挟めない",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.join()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/join",
      pageTitle: "Array.prototype.join()",
    },
  ],
};
