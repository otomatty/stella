import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01CopyValue: Assignment = {
  id: "S1-Ch01-10-copy-value",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 10,
  title: "変数の値を別の変数に代入する",
  newConcept: "変数の右辺には別の変数も書ける。 中身がコピーされる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

次の手順で値をコピーしてください。

1. \`original\` に \`"宝物"\` を入れる
2. \`copy\` に \`original\` の中身を入れる (= **コピー**)
3. \`copy\` を出力する

## 期待する出力

\`\`\`
宝物
\`\`\`

## ポイント

- \`=\` の右側には別の変数を書けます。
- \`const copy = original;\` と書くと、 \`original\` の中身が \`copy\` にコピーされます。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// もう 1 つ const の変数を作り、 = の右辺に最初の変数名を書いて値をコピーする


// コピー先の変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 宝物 になる",
      expectedStdout: "宝物",
    },
  ],
  hints: [
    "右側に **別の変数の名前** を書くと、 その値がコピーされます。",
    "`const copy = original;` だけで、 `copy` には `original` の中身が入ります。",
    "解答例:\n```js\nconst original = \"宝物\";\nconst copy = original;\nconsole.log(copy);\n```",
  ],
  solution: `const original = "宝物";
const copy = original;
console.log(copy);
`,
};
