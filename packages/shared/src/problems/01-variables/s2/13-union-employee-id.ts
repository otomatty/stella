import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01UnionEmployeeId: Assignment = {
  id: "S2-Ch01-153-union-employee-id",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 13,
  title: "数値と文字列のどちらも受け取れる変数",
  newConcept: "ユニオン型は「つないだ型のどれか」を表す",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

社員番号は、 旧システムでは数値 (例: \`1001\`)、 新システムでは文字列 (例: \`"E-1001"\`) で管理されています。 どちらも受け取れる変数 \`employeeId\` を宣言し、 次の順で代入して表示してください。

1. \`1001\` を入れて表示する
2. \`"E-1001"\` を入れ直して表示する

## 期待する出力

\`\`\`
1001
E-1001
\`\`\`

## ポイント

- ユニオン型は「つないだ型のどれか」を表します。 \`number | string\` なら数値と文字列のどちらも受け取れます。
- 「なんでも入る型」ではありません。 試しに \`employeeId = true;\` と書くと「Type 'boolean' is not assignable to type 'string | number'.」というエラーになることを確かめてみてください。
- ただし提出するコードには \`true\` を代入する行を **残さない** でください。 確認したら消します。
`,
  starterFiles: singleFile(
    `// 数値と文字列のどちらも受け取れる型で宣言し、 まず 1001 を入れる


// 表示する


// "E-1001" を入れ直す


// もう一度表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "数値と文字列が順に出力される",
      expectedStdout: "1001\nE-1001",
    },
  ],
  hints: [
    "型を 2 つ並べたいときは、 縦棒 `|` でつなぎます。 「または」と読みます。",
    "書き方は `let employeeId: number | string = 1001;` です。 値を入れ直すので `let` を使います。",
    '解答例:\n```ts\nlet employeeId: number | string = 1001;\nconsole.log(employeeId);\n\nemployeeId = "E-1001";\nconsole.log(employeeId);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `let employeeId: number | string = 1001;
console.log(employeeId);

employeeId = "E-1001";
console.log(employeeId);
`,
  badSolutions: [
    {
      code: `const oldEmployeeId: number = 1001;
const newEmployeeId: string = "E-1001";

console.log(oldEmployeeId);
console.log(oldEmployeeId);
`,
      description:
        "1 つの変数にまとめず別々の変数を作った結果、 表示する変数を取り違えている",
    },
  ],
  mdnSections: [{ heading: "データ型" }, { heading: "宣言と初期化" }],
};
