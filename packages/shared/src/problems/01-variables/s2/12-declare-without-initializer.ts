import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01DeclareWithoutInitializer: Assignment = {
  id: "S2-Ch01-123-declare-without-initializer",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 12,
  title: "初期値のない変数は undefined から始まる",
  newConcept: "初期値がないと型を判別できないので、そこだけ型注釈を書く",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

店舗の情報を表す変数を 4 つ宣言してください。 型注釈を書くのは **推論できないときだけ** にします (本研修の方針)。

| 意味 | 変数名 | 初期値 |
| --- | --- | --- |
| 店名 | \`shopName\` | \`"青山コーヒー店"\` |
| 開店時刻 | \`openHour\` | \`9\` |
| 現在の来店者数 | \`currentVisitors\` | \`0\` |
| 直近の注文者名 | \`lastOrderName\` | **なし** (文字列が入る予定) |

宣言できたら 4 つを宣言順に表示してください。 そのあと最初の注文が入ったものとして \`lastOrderName\` に \`"田中"\` を入れ、 もう一度 \`lastOrderName\` を表示してください。

## 期待する出力

\`\`\`
青山コーヒー店
9
0
undefined
田中
\`\`\`

## ポイント

- 上の 3 つは初期値があるため、 型推論に任せられます。 同じ情報を 2 か所に書かずに済み、 値を変えたときの書き換え漏れも防げます。
- \`lastOrderName\` だけは初期値がなく、 コンパイラーが型を判別できないため型注釈が必要です。「書くのは推論できないときだけ」という方針の、 まさにその場面です。
- **初期値なしで宣言した変数には \`undefined\` が入っています。** 「型注釈を書かずに済ませたいから」と空文字などの適当な初期値を入れると、「値がまだない」という事実が消えてしまいます。
`,
  starterFiles: singleFile(
    `// 店名（初期値あり）


// 開店時刻（初期値あり）


// 現在の来店者数（初期値あり）


// 直近の注文者名（初期値なし。 文字列が入る予定）


// 4 つを宣言順に表示する


// 直近の注文者名に "田中" を入れて、 もう一度表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "初期値なしの undefined と、 代入後の名前が出力される",
      expectedStdout: "青山コーヒー店\n9\n0\nundefined\n田中",
    },
  ],
  hints: [
    "初期値がある宣言からは、 コンパイラーが型を自動で判別できます。 その 3 つに `: string` や `: number` は要りません。",
    "`lastOrderName` は初期値を書かずに `let lastOrderName: string;` と宣言します。 判別する材料がないので、 ここだけ型注釈を残します。",
    '解答例:\n```ts\nconst shopName = "青山コーヒー店";\nconst openHour = 9;\nlet currentVisitors = 0;\nlet lastOrderName: string;\n\nconsole.log(shopName);\nconsole.log(openHour);\nconsole.log(currentVisitors);\nconsole.log(lastOrderName);\n\nlastOrderName = "田中";\nconsole.log(lastOrderName);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const shopName = "青山コーヒー店";
const openHour = 9;
let currentVisitors = 0;
let lastOrderName: string;

console.log(shopName);
console.log(openHour);
console.log(currentVisitors);
console.log(lastOrderName);

lastOrderName = "田中";
console.log(lastOrderName);
`,
  badSolutions: [
    {
      code: `const shopName = "青山コーヒー店";
const openHour = 9;
let currentVisitors = 0;
let lastOrderName = "";

console.log(shopName);
console.log(openHour);
console.log(currentVisitors);
console.log(lastOrderName);

lastOrderName = "田中";
console.log(lastOrderName);
`,
      description:
        "型注釈を書かずに済ませるため空文字を初期値にしており、「値がまだない」状態が空文字にすり替わっている",
    },
  ],
  mdnSections: [{ heading: "宣言と初期化" }, { heading: "データ型" }],
};
