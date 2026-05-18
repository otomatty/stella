import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01MultipleVars: Assignment = {
  id: "S1-Ch01-07-multiple-vars",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 7,
  title: "複数の変数を扱う",
  newConcept: "複数の変数を順に宣言して、 それぞれ出力する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

次の 3 つの変数を const で作り、 \`firstName\` → \`lastName\` → \`age\` の順に \`console.log\` で出力してください。

- \`firstName\`: \`"花子"\`
- \`lastName\`: \`"山田"\`
- \`age\`: \`25\`

## 期待する出力

\`\`\`
花子
山田
25
\`\`\`
`,
  starterFiles: singleFile(`// const で 3 つの変数を順に宣言する (1 つ目・2 つ目は文字列、 3 つ目は数値)


// 宣言した順に console.log でそれぞれを出力する

`),
  tests: [
    {
      name: "stdout が 花子 / 山田 / 25 の 3 行になる",
      expectedStdout: "花子\n山田\n25",
    },
  ],
  hints: [
    "変数は 1 行に 1 つずつ宣言します。 文字列は `\"\"`、 数値はクォート無しで書きます。",
    "`console.log` は宣言した順とは別の順で呼び出せます。 今回は宣言順 = 出力順です。",
    "解答例:\n```js\nconst firstName = \"花子\";\nconst lastName = \"山田\";\nconst age = 25;\nconsole.log(firstName);\nconsole.log(lastName);\nconsole.log(age);\n```",
  ],
  solution: `const firstName = "花子";
const lastName = "山田";
const age = 25;
console.log(firstName);
console.log(lastName);
console.log(age);
`,
};
