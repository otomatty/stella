import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch08EmployeeList: Assignment = {
  id: "S2-Ch08-342-employee-list",
  stage: "S2",
  chapterId: "Ch08",
  sequence: 5,
  title: "型エイリアスの配列を for-of で回す",
  newConcept: "Employee[] は「Employee 型の値を並べた配列」",
  estimatedMinutes: 11,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

前問と同じ \`Employee\` 型 (\`readonly id: string\` / \`name: string\` / \`department?: string\`) を用意し、 その型を使って社員 3 人の配列を作ってください。

| \`id\` | \`name\` | \`department\` |
| --- | --- | --- |
| \`"E-001"\` | \`"田中"\` | \`"営業部"\` |
| \`"E-002"\` | \`"佐藤"\` | 省略する |
| \`"E-003"\` | \`"鈴木"\` | \`"開発部"\` |

作ったら \`for-of\` で **全員の名前** を表示してください。

## 期待する出力

\`\`\`
田中
佐藤
鈴木
\`\`\`

## ポイント

- \`Employee[]\` で「\`Employee\` 型の配列」を表します。「要素の型 + \`[]\`」のルールは型エイリアスにもそのまま使えます。
- 外側の角かっこが配列、 内側の中かっこが 1 件ぶんのデータです。
- \`for (const employee of employees)\` の \`employee\` には、 **要素そのもの** (1 件ぶんのオブジェクト) が入ります。 インデックスは入りません。
- したがって名前は \`employee.name\` で読めます。
`,
  starterFiles: singleFile(
    `// Employee 型を作る


// Employee[] 型で社員 3 人の配列を作る


// for-of で全員の名前を表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "3 人の名前が順に出力される",
      expectedStdout: "田中\n佐藤\n鈴木",
    },
  ],
  hints: [
    "配列の宣言は `const employees: Employee[] = [ { ... }, { ... }, { ... } ];` です。 各要素の中身は前問で書いた社員 1 人ぶんと同じ形です。",
    "`for-of` が取り出すのは要素そのものです。 取り出した変数からドットでプロパティを読みます。",
    '解答例:\n```ts\ntype Employee = {\n  readonly id: string;\n  name: string;\n  department?: string;\n};\n\nconst employees: Employee[] = [\n  { id: "E-001", name: "田中", department: "営業部" },\n  { id: "E-002", name: "佐藤" },\n  { id: "E-003", name: "鈴木", department: "開発部" },\n];\n\nfor (const employee of employees) {\n  console.log(employee.name);\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `type Employee = {
  readonly id: string;
  name: string;
  department?: string;
};

const employees: Employee[] = [
  { id: "E-001", name: "田中", department: "営業部" },
  { id: "E-002", name: "佐藤" },
  { id: "E-003", name: "鈴木", department: "開発部" },
];

for (const employee of employees) {
  console.log(employee.name);
}
`,
  badSolutions: [
    {
      code: `type Employee = {
  readonly id: string;
  name: string;
  department?: string;
};

const employees: Employee[] = [
  { id: "E-001", name: "田中", department: "営業部" },
  { id: "E-002", name: "佐藤" },
  { id: "E-003", name: "鈴木", department: "開発部" },
];

for (const i of employees) {
  console.log(employees[i].name);
}
`,
      description:
        "for-of がインデックスを取り出すと思い込み、 要素そのものを添字に使ってしまっている",
    },
  ],
  mdnSections: [
    { heading: "オブジェクトとプロパティ" },
    { heading: "プロパティのアクセス" },
  ],
};
