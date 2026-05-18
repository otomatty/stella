import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03ReplaceAll: Assignment = {
  id: "S2-Ch03-04-replaceAll",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 4,
  title: "replaceAll で全箇所を置換する",
  newConcept: "replaceAll は一致するすべての箇所を置き換える",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"a-b-c-d"\` の **すべての** \`"-"\` を \`":"\` に置き換えて出力してください。

## 期待する出力

\`\`\`
a:b:c:d
\`\`\`

## ポイント

- \`"a-b-c-d".replaceAll("-", ":")\` → \`"a:b:c:d"\`
- \`replace\` だと最初の 1 箇所しか置き換わりません。 全置換するなら \`replaceAll\`。
`,
  starterFiles: singleFile(`// 区切り文字付きの文字列を const の変数に入れる


// その変数に対して replaceAll で全ての区切り文字を別の文字に置換した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が a:b:c:d になる",
      expectedStdout: "a:b:c:d",
    },
  ],
  hints: [
    "`text.replaceAll(\"-\", \":\")` で 4 箇所すべてが `:` に変わります。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst text = \"a-b-c-d\";\nconsole.log(text.replaceAll(\"-\", \":\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "replaceAll", label: "replaceAll を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const text = "a-b-c-d";
console.log(text.replaceAll("-", ":"));
`,
  badSolutions: [
    {
      code: `console.log("a:b:c:d");
`,
      description: "replaceAll を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.replaceAll()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll", pageTitle: "String.prototype.replaceAll()" },
  ],
};
