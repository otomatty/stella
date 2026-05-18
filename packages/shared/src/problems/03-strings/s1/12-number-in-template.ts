import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03NumberInTemplate: Assignment = {
  id: "S1-Ch03-12-number-in-template",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 12,
  title: "テンプレートリテラルに数値を埋め込む",
  newConcept: "${} の中には数値を入れた変数も書ける",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`age\` に \`25\` を入れ、 テンプレートリテラルで \`"あなたは 25 歳です"\` を作って出力してください。

数値も \`\${age}\` の形で埋め込めます (= 自動的に文字列化されます)。

## 期待する出力

\`\`\`
あなたは 25 歳です
\`\`\`
`,
  starterFiles: singleFile(`// 年齢を表す数値を const の変数に入れる


// バッククォートで囲んだテンプレートリテラルに \${変数名} で値を埋め込み、
// console.log で出力する

`),
  tests: [
    {
      name: "stdout が あなたは 25 歳です になる",
      expectedStdout: "あなたは 25 歳です",
    },
  ],
  hints: [
    "数値の変数も `${変数名}` の形で埋め込めます。",
    "`` `あなたは ${age} 歳です` `` のように書きます。",
    "解答例:\n```js\nconst age = 25;\nconsole.log(`あなたは ${age} 歳です`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "age",
          label: "const age を宣言する",
        },
        {
          kind: "node",
          nodeType: "TemplateLiteral",
          label: "テンプレートリテラルを使う",
        },
      ],
    },
  },
  solution: "const age = 25;\nconsole.log(`あなたは ${age} 歳です`);\n",
  badSolutions: [
    {
      code: `const age = 25;
console.log("あなたは " + age + " 歳です");
`,
      description: "テンプレートリテラルではなく + で連結している",
    },
  ],
};
