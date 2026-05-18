import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01NamingCamelCase: Assignment = {
  id: "S1-Ch01-05-naming-camelcase",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 5,
  title: "適切な変数名を camelCase で付ける",
  newConcept: "JavaScript では複数単語の変数名を camelCase で書く",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

「ユーザの名前」 を保持する変数を **\`userName\`** という名前 (camelCase) で作り、 \`"Taro"\` を入れて出力してください。

## 期待する出力

\`\`\`
Taro
\`\`\`

## ポイント

- 単語が 2 つ以上つながる変数名は **2 つ目以降の頭文字を大文字** にします (camelCase)。
  - 例: \`userName\` / \`firstName\` / \`isAdmin\`
- スネークケース (\`user_name\`) や全部小文字 (\`username\`) は JavaScript では一般的ではありません。
`,
  starterFiles: singleFile(`// const で userName という変数を宣言し、 "Taro" を入れる
// userName の N が大文字になっているか確認

`),
  tests: [
    {
      name: "stdout が Taro になる",
      expectedStdout: "Taro",
    },
  ],
  hints: [
    "「ユーザの名前」 のように 2 単語の変数名は、 2 つ目の単語の頭を大文字にします。",
    "今回の名前は **`userName`** です (`user_name` でも `username` でもありません)。",
    "解答例:\n```js\nconst userName = \"Taro\";\nconsole.log(userName);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "userName",
          label: "const userName を camelCase で宣言する",
        },
      ],
    },
  },
  solution: `const userName = "Taro";
console.log(userName);
`,
  badSolutions: [
    {
      code: `const user_name = "Taro";
console.log(user_name);
`,
      description: "snake_case (アンダースコア区切り) で宣言している",
    },
    {
      code: `const username = "Taro";
console.log(username);
`,
      description: "全部小文字 (camelCase になっていない)",
    },
  ],
  mdnSections: [
    { heading: "識別子" },
  ],
};
