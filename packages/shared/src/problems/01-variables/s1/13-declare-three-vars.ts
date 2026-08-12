import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01DeclareThreeVars: Assignment = {
  id: "S1-Ch01-111-declare-three-vars",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 13,
  title: "3 つの値をふさわしいキーワードで宣言する",
  newConcept: "変わらない値は const、更新される値は let",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 3 つの値を、 それぞれふさわしいキーワード (\`let\` または \`const\`) で宣言し、 \`console.log\` で順に表示してください。

- 会社名「株式会社サンプル」(今後変わらない)
- 今月の売上目標 \`500000\` (今後変わらない)
- 現在の売上 \`120000\` (日々更新される)

そのあと、 今日の受注で **現在の売上が \`150000\` に更新された** ものとして値を入れ直し、 もう一度その値を表示してください。

## 期待する出力

\`\`\`
株式会社サンプル
500000
120000
150000
\`\`\`

## ポイント

- 変わらない値は \`const\`、 更新される値は \`let\` で宣言します。
- 迷ったらまず \`const\` にして、 再代入が必要になったときだけ \`let\` に変えます。
- 値を入れ直せるのは \`let\` で宣言した変数だけです。 \`const\` にしていると、 入れ直すところでエラーになります。
- 2 回目に値を入れるときは \`let\` を書きません。 \`currentSales = 150000;\` のように変数名と値だけを書きます。
`,
  starterFiles: singleFile(
    `// 会社名（変わらない）


// 今月の売上目標（変わらない）


// 現在の売上（日々更新される）


// 3 つを console.log で順に表示する


// 現在の売上を 150000 に入れ直して、 もう一度表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "3 行と、 更新後の売上が出力される",
      expectedStdout: "株式会社サンプル\n500000\n120000\n150000",
    },
  ],
  hints: [
    "「今後変わらない」と書かれている値は `const` です。",
    "「日々更新される」値だけは後から入れ直します。 `const` では入れ直せないので `let` にします。",
    '解答例:\n```ts\nconst companyName = "株式会社サンプル";\nconst salesTarget = 500000;\nlet currentSales = 120000;\n\nconsole.log(companyName);\nconsole.log(salesTarget);\nconsole.log(currentSales);\n\ncurrentSales = 150000;\nconsole.log(currentSales);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const companyName = "株式会社サンプル";
const salesTarget = 500000;
let currentSales = 120000;

console.log(companyName);
console.log(salesTarget);
console.log(currentSales);

currentSales = 150000;
console.log(currentSales);
`,
  badSolutions: [
    {
      code: `const companyName = "株式会社サンプル";
const salesTarget = 500000;
const currentSales = 120000;

console.log(companyName);
console.log(salesTarget);
console.log(currentSales);

currentSales = 150000;
console.log(currentSales);
`,
      description:
        "日々更新される売上まで const で宣言したため、 値を入れ直すところでエラーになる",
    },
  ],
  mdnSections: [{ heading: "宣言と初期化" }, { heading: "定数" }],
};
