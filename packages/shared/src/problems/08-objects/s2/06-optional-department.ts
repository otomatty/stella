import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch08OptionalDepartment: Assignment = {
  id: "S2-Ch08-343-optional-department",
  stage: "S2",
  chapterId: "Ch08",
  sequence: 6,
  title: "省略されたプロパティに既定値を用意する",
  newConcept: "オプショナルなプロパティの型は string | undefined",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

前問と同じ \`Employee\` 型と、 同じ 3 人の配列を用意してください。

| \`id\` | \`name\` | \`department\` |
| --- | --- | --- |
| \`"E-001"\` | \`"田中"\` | \`"営業部"\` |
| \`"E-002"\` | \`"佐藤"\` | 省略する |
| \`"E-003"\` | \`"鈴木"\` | \`"開発部"\` |

\`for-of\` で全員ぶん、 **「名前: 部署名」** の形で表示してください。 ただし \`department\` が省略されている社員は部署名の代わりに「所属なし」と表示します。

## 期待する出力

\`\`\`
田中: 営業部
佐藤: 所属なし
鈴木: 開発部
\`\`\`

## ポイント

- \`department\` はオプショナルなので、 読み出したときの型は \`string | undefined\` です。 **そのまま表示すると \`undefined\` と出てしまいます。**
- \`??\` を使うと、 値がないときだけ既定値に置き換えられます (\`employee.department ?? "所属なし"\`)。
- \`if (employee.department !== undefined)\` で分けても同じ結果になります。 既定値を入れたいだけなら \`??\` のほうが短く済みます。
- 省略できるということは、 ないかもしれないということです。 使う前に絞り込むか \`??\` で既定値を用意します。
`,
  starterFiles: singleFile(
    `// Employee 型と、 社員 3 人の配列を用意する（前問と同じ）


// for-of で「名前: 部署名」を表示する
// department が省略されている社員は「所属なし」と表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "省略された社員だけ所属なしと出力される",
      expectedStdout: "田中: 営業部\n佐藤: 所属なし\n鈴木: 開発部",
    },
  ],
  hints: [
    "まずは部署名を素直に `employee.department` と書いて表示してみて、 省略されている社員の行がどうなるか見てください。",
    "`??` は左の値が `undefined` のときだけ右を使います。 部署名を読み出すところに既定値を添えます。",
    '解答例:\n```ts\nfor (const employee of employees) {\n  const department = employee.department ?? "所属なし";\n  console.log(`${employee.name}: ${department}`);\n}\n```',
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
  const department = employee.department ?? "所属なし";
  console.log(\`\${employee.name}: \${department}\`);
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

for (const employee of employees) {
  console.log(\`\${employee.name}: \${employee.department}\`);
}
`,
      description:
        "オプショナルなプロパティをそのまま埋め込んでおり、 省略されている社員が undefined と表示される",
    },
  ],
  mdnSections: [
    { heading: "オブジェクトとプロパティ" },
    { heading: "プロパティのアクセス" },
  ],
};
