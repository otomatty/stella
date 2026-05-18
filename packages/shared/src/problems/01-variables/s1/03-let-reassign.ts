import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01LetReassign: Assignment = {
  id: "S1-Ch01-03-let-reassign",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 3,
  title: "let で再代入する",
  newConcept: "let で宣言した変数は後から値を入れ直せる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`let\` で **\`count\`** を作り、 最初は \`0\` を入れます。 その値を \`console.log\` で出力した後、 \`count\` に \`1\` を入れ直して、 もう一度 \`console.log\` で出力してください。

## 期待する出力

\`\`\`
0
1
\`\`\`

## ポイント

- \`let\` で作った変数は **後から値を入れ直せます** (= 再代入)。
- 入れ直すときは \`let\` を **2 回目には書きません**。 \`count = 1;\` のように変数名と値だけを書きます。
`,
  starterFiles: singleFile(`// let で変数を宣言し、 初期値を入れる


// その変数の値を console.log で出力する


// let を書かずに変数名 = 新しい値 で値を入れ直す


// もう一度 console.log で出力する

`),
  tests: [
    {
      name: "stdout が 0 と 1 の 2 行になる",
      expectedStdout: "0\n1",
    },
  ],
  hints: [
    "再代入したいときは `const` ではなく `let` を使います。",
    "2 回目に値を入れるときは `let` を書かず、 `count = 1;` のように **変数名と値だけ** を書きます。",
    "解答例:\n```js\nlet count = 0;\nconsole.log(count);\ncount = 1;\nconsole.log(count);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `let count = 0;
console.log(count);
count = 1;
console.log(count);
`,
  badSolutions: [
    {
      code: `const count = 0;
console.log(count);
count = 1;
console.log(count);
`,
      description: "const で宣言してから再代入しようとしている",
    },
  ],
  mdnSections: [{ heading: "let" }, { heading: "const" }],
};
