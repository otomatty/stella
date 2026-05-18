import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03TemplateLiteral: Assignment = {
  id: "S1-Ch03-03-template-literal",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 3,
  title: "テンプレートリテラルで文字列を作る",
  newConcept: "バッククォートで囲んだ文字列に変数を埋め込む",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`name\` に \`"花子"\` を入れ、 テンプレートリテラルで \`"花子さん、 こんにちは!"\` を作って出力してください。

## 期待する出力

\`\`\`
花子さん、 こんにちは!
\`\`\`

## ポイント

- バッククォートで囲んだ文字列の中で \`\${変数}\` と書くと、 変数の値が埋め込まれます。
`,
  starterFiles: singleFile(`// 名前の文字列を const の変数に入れる


// バッククォートで囲んだテンプレートリテラルで挨拶文を組み立て、 console.log で出力する
// (\${変数名} で値を埋め込む)

`),
  tests: [
    {
      name: "stdout が 花子さん、 こんにちは! になる",
      expectedStdout: "花子さん、 こんにちは!",
    },
  ],
  hints: [
    "バッククォートで囲んだ文字列の中で `${変数名}` と書くと、 変数の値が埋め込まれます。",
    "`` `${name}さん、 こんにちは!` `` の形にします。",
    "解答例:\n```js\nconst name = \"花子\";\nconsole.log(`${name}さん、 こんにちは!`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "node",
          nodeType: "TemplateLiteral",
          label: "テンプレートリテラルを使う",
        },
      ],
    },
  },
  solution: "const name = \"花子\";\nconsole.log(`${name}さん、 こんにちは!`);\n",
  badSolutions: [
    {
      code: `const name = "花子";
console.log(name + "さん、 こんにちは!");
`,
      description: "テンプレートリテラルではなく + で連結している",
    },
  ],
  mdnSections: [
    { heading: "テンプレートリテラル" },
  ],
};
