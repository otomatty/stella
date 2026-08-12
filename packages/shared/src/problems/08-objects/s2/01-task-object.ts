import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch08TaskObject: Assignment = {
  id: "S2-Ch08-331-task-object",
  stage: "S2",
  chapterId: "Ch08",
  sequence: 1,
  title: "オブジェクトを作って表示用に整える",
  newConcept: "違う種類の値をひとまとまりにするのがオブジェクト",
  estimatedMinutes: 11,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の情報を持つオブジェクト \`task\` を、 **型注釈を付けて** 作ってください。

| 意味 | プロパティ名 | 型 | 値 |
| --- | --- | --- | --- |
| タイトル | \`title\` | 文字列 | \`"請求書を作成する"\` |
| 完了したか | \`isDone\` | 真偽値 | \`false\` |

作ったら、 テンプレートリテラルで **「タイトル(状態)」** の形に整えて表示してください。 状態は完了なら「完了」、 そうでなければ「未完了」とします。

## 期待する出力

\`\`\`
請求書を作成する(未完了)
\`\`\`

## ポイント

- オブジェクトの型注釈は \`{ title: string; isDone: boolean }\` のように、 プロパティ名と型をセミコロンで並べます。
- プロパティの読み取りは **ドットと名前** です (\`task.title\`)。 角かっこと番号は配列のほうです。
- 真偽値のプロパティ名は \`is\` で始めると読みやすくなります。
- 表示用の文字列を選ぶところは三項演算子が使えます。 \`isDone\` をそのまま埋め込むと \`false\` と表示されてしまいます。
`,
  starterFiles: singleFile(
    `// task オブジェクトを型注釈付きで作る


// 完了 / 未完了 の文字列を三項演算子で選ぶ


// テンプレートリテラルで「タイトル(状態)」の形に整えて表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "タイトルと状態が 1 行で出力される",
      expectedStdout: "請求書を作成する(未完了)",
    },
  ],
  hints: [
    "オブジェクトの宣言は `const task: { title: string; isDone: boolean } = { title: ..., isDone: ... };` です。 型の側はセミコロン区切り、 値の側はカンマ区切りです。",
    "`task.isDone` は `true` / `false` です。 表示したいのは「完了」「未完了」という文字列なので、 いったん別の変数に選び分けてから埋め込みます。",
    '解答例:\n```ts\nconst task: { title: string; isDone: boolean } = {\n  title: "請求書を作成する",\n  isDone: false,\n};\n\nconst status = task.isDone ? "完了" : "未完了";\nconsole.log(`${task.title}(${status})`);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const task: { title: string; isDone: boolean } = {
  title: "請求書を作成する",
  isDone: false,
};

const status = task.isDone ? "完了" : "未完了";
console.log(\`\${task.title}(\${status})\`);
`,
  badSolutions: [
    {
      code: `const task: { title: string; isDone: boolean } = {
  title: "請求書を作成する",
  isDone: false,
};

console.log(\`\${task.title}(\${task.isDone})\`);
`,
      description:
        "真偽値をそのままテンプレートリテラルに埋め込んでおり、 表示用の文字列に変換していない",
    },
  ],
  mdnSections: [
    { heading: "オブジェクトとプロパティ" },
    { heading: "プロパティのアクセス" },
  ],
};
