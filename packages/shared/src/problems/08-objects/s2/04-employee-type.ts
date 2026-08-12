import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch08EmployeeType: Assignment = {
  id: "S2-Ch08-341-employee-type",
  stage: "S2",
  chapterId: "Ch08",
  sequence: 4,
  title: "型エイリアスで社員の型を作る",
  newConcept: "readonly は名前の前、 ? は名前の後ろ",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

社員を表す型 \`Employee\` を作ってください。 プロパティは次のとおりです。

| プロパティ名 | 型 | 条件 |
| --- | --- | --- |
| \`id\` | 文字列 | **書き換え不可** |
| \`name\` | 文字列 | — |
| \`department\` | 文字列 | **省略可能** |

作ったら、 \`department\` のある社員とない社員を 1 人ずつ宣言し、 順に表示してください。

| 変数名 | \`id\` | \`name\` | \`department\` |
| --- | --- | --- | --- |
| \`a\` | \`"E-001"\` | \`"田中"\` | \`"営業部"\` |
| \`b\` | \`"E-002"\` | \`"佐藤"\` | 省略する |

## 期待する出力

\`\`\`
{"id":"E-001","name":"田中","department":"営業部"}
{"id":"E-002","name":"佐藤"}
\`\`\`

## ポイント

- 型エイリアスは \`type 型の名前 = 型;\` の形で書きます。 型名は大文字始まりにするのが慣習です。
- \`readonly\` はプロパティ名の **前**、 \`?\` は名前の **後ろ** です。 位置が逆なので混同しないよう注意してください。
- **「省略可能」は「空文字を入れる」ではありません。** 省略した社員には、 そのプロパティ自体が存在しません。 表示にも現れません。
`,
  starterFiles: singleFile(
    `// Employee 型を作る（id は書き換え不可、 department は省略可能）


// department のある社員 a を宣言する


// department のない社員 b を宣言する


// a、 b の順に表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "department あり・なしの社員が順に出力される",
      expectedStdout:
        '{"id":"E-001","name":"田中","department":"営業部"}\n{"id":"E-002","name":"佐藤"}',
    },
  ],
  hints: [
    "型の定義は `type Employee = { ... };` です。 中はオブジェクトの型注釈と同じ書き方 (プロパティ名: 型; の並び) です。",
    "書き換え不可は `readonly id: string;`、 省略可能は `department?: string;` です。",
    '解答例:\n```ts\ntype Employee = {\n  readonly id: string;\n  name: string;\n  department?: string;\n};\n\nconst a: Employee = { id: "E-001", name: "田中", department: "営業部" };\nconst b: Employee = { id: "E-002", name: "佐藤" };\n\nconsole.log(a);\nconsole.log(b);\n```',
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

const a: Employee = { id: "E-001", name: "田中", department: "営業部" };
const b: Employee = { id: "E-002", name: "佐藤" };

console.log(a);
console.log(b);
`,
  badSolutions: [
    {
      code: `type Employee = {
  readonly id: string;
  name: string;
  department?: string;
};

const a: Employee = { id: "E-001", name: "田中", department: "営業部" };
const b: Employee = { id: "E-002", name: "佐藤", department: "" };

console.log(a);
console.log(b);
`,
      description:
        "省略可能を「空文字を入れる」と取り違えており、 所属が無い社員にも department が存在してしまっている",
    },
  ],
  mdnSections: [
    { heading: "オブジェクトとプロパティ" },
    { heading: "新しいオブジェクトの作成" },
  ],
};
