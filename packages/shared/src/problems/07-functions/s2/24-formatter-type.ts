import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07FormatterType: Assignment = {
  id: "S2-Ch07-442-formatter-type",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 24,
  title: "関数の型に名前を付けて使い回す",
  newConcept: "type で関数の型に名前を付ける",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

「文字列を受け取って文字列を返す」関数の型に \`Formatter\` という名前を付けてください。 その型を使って、 次の 2 つの関数を作ります。

| 関数名 | 働き |
| --- | --- |
| \`bracket\` | 受け取った文字列を \`【\` と \`】\` で挟んで返す |
| \`honorific\` | 受け取った文字列の **末尾** に \`様\` を付けて返す |

## 期待する挙動

- \`bracket("コーヒー")\` は \`"【コーヒー】"\` を返します。
- \`honorific\` は名前のうしろに \`様\` が付きます。 前に付けてはいけません。
- どちらも空の文字列を渡せば、 飾りだけが残った文字列を返します。

## ポイント

- 関数の型は \`(引数名: 型) => 戻り値の型\` という形で書きます。 矢印の左が引数、 右が戻り値です。
- 型エイリアスで名前を付けると、 同じ形の関数であることが一目で分かります。
- 型を付けた側で引数の型が決まるので、 実装側では引数の型注釈を省略できます。
`,
  starterFiles: singleFile(
    `// 「文字列を受け取って文字列を返す」関数の型に Formatter という名前を付ける


// Formatter 型を使って bracket と honorific の 2 つを作る

`,
    "main.ts",
  ),
  entryPoints: ["bracket", "honorific"],
  demoCall: `console.log(bracket("コーヒー"), honorific("田中"));`,
  tests: [
    {
      name: 'bracket("コーヒー") は "【コーヒー】"',
      code: `bracket("コーヒー") === "【コーヒー】"`,
    },
    {
      name: 'honorific("田中") は "田中様"',
      code: `honorific("田中") === "田中様"`,
    },
    {
      name: "bracket は空文字でもかっこだけを返す",
      code: `bracket("") === "【】"`,
    },
    {
      name: "honorific は末尾に 様 を付ける",
      code: `honorific("鈴木").slice(-1) === "様" && honorific("鈴木").length === 3`,
    },
  ],
  hints: [
    "`type 名前 = ...;` の右辺に、 引数のかっこと矢印と戻り値の型だけを書きます。 中身 (処理) は書きません。",
    "2 つの関数は `const 名前: Formatter = (引数) => ...;` の形で書けます。 どちらも文字列を組み立てて返すだけです。",
    "解答例:\n```ts\ntype Formatter = (name: string) => string;\n\nconst bracket: Formatter = (name) => `【${name}】`;\nconst honorific: Formatter = (name) => `${name}様`;\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `type Formatter = (name: string) => string;

const bracket: Formatter = (name) => \`【\${name}】\`;
const honorific: Formatter = (name) => \`\${name}様\`;
`,
  badSolutions: [
    {
      code: `type Formatter = (name: string) => string;

const bracket: Formatter = (name) => \`【\${name}】\`;
const honorific: Formatter = (name) => \`様\${name}\`;
`,
      description: "敬称を名前の前に付けてしまっている (末尾に付けるのが正しい)",
    },
  ],
  mdnSections: [{ heading: "関数の定義" }, { heading: "アロー関数" }],
};
