import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04ArrayOfStrings: Assignment = {
  id: "S1-Ch04-11-array-of-strings",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 11,
  title: "文字列配列の最初と最後を組み合わせる",
  newConcept: "添字と length を組み合わせて要素を取り出し、 文字列を作る",
  estimatedMinutes: 7,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`["朝", "昼", "晩"]\` を \`meals\` に入れ、 テンプレートリテラルで「最初と最後の食事」を組み立てて出力してください。

最初は \`meals[0]\`、 最後は \`meals[meals.length - 1]\` で取り出せます。

## 期待する出力

\`\`\`
最初: 朝、 最後: 晩
\`\`\`

## ポイント

- 配列の最後の要素は **要素数 - 1** 番目です。 \`meals.length\` が 3 なら、 最後は \`meals[2]\` (= 3 - 1)。
- \`meals[meals.length - 1]\` は配列の長さに依存せず常に最後を取れる書き方です。
`,
  starterFiles: singleFile(`// 文字列の配列を const の変数に入れる


// テンプレートリテラルで「最初: ...、 最後: ...」 形式の文字列を組み立て、 console.log で出力する
// (最初の要素は添字 0、 最後の要素は添字 length - 1 で取り出す)

`),
  tests: [
    {
      name: "stdout が 最初: 朝、 最後: 晩 になる",
      expectedStdout: "最初: 朝、 最後: 晩",
    },
  ],
  hints: [
    "最後の要素の添字は `meals.length - 1`。",
    "テンプレートリテラルの中で `${meals[0]}` と `${meals[meals.length - 1]}` を埋め込みます。",
    "解答例:\n```js\nconst meals = [\"朝\", \"昼\", \"晩\"];\nconsole.log(`最初: ${meals[0]}、 最後: ${meals[meals.length - 1]}`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "meals",
          label: "const meals を宣言する",
        },
        {
          kind: "node",
          nodeType: "TemplateLiteral",
          label: "テンプレートリテラルで組み立てる",
        },
      ],
    },
  },
  solution: "const meals = [\"朝\", \"昼\", \"晩\"];\nconsole.log(`最初: ${meals[0]}、 最後: ${meals[meals.length - 1]}`);\n",
};
