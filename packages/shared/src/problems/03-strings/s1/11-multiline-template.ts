import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03MultilineTemplate: Assignment = {
  id: "S1-Ch03-11-multiline-template",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 11,
  title: "テンプレートリテラルで複数行を書く",
  newConcept: "バッククォートで囲んだ文字列はそのまま改行を含められる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

テンプレートリテラルを使って、 次の **2 行** を 1 回の console.log で出力してください。

\`\`\`
こんにちは
さようなら
\`\`\`

## ポイント

- バッククォートで囲んだ文字列は **そのまま改行を入れられます** (\`\\n\` は不要)。
- 通常の \`"..."\` だと改行を入れるとエラーになります。
`,
  starterFiles: singleFile(`// バッククォートで囲んだテンプレートリテラルの中で実際に改行を入れて、
// 期待出力と同じ複数行の文字列を作り、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が 2 行になる",
      expectedStdout: "こんにちは\nさようなら",
    },
  ],
  hints: [
    "バッククォートの中では **改行をそのまま** 書けます。",
    "`` ` `` で開いた後に改行して、 2 行目を書いてから `` ` `` で閉じます。",
    "解答例:\n```js\nconsole.log(`こんにちは\nさようなら`);\n```",
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
  solution: "console.log(`こんにちは\nさようなら`);\n",
};
