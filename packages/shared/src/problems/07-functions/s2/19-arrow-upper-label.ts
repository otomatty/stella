import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07ArrowUpperLabel: Assignment = {
  id: "S2-Ch07-421-arrow-upper-label",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 19,
  title: "関数宣言をアロー関数に書き換える",
  newConcept: "function 宣言と const + アロー関数の対応",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  language: "typescript",
  description: `## やること

次の関数宣言と **同じ働きをするアロー関数** を、 同じ名前 \`toUpperLabel\` で書いてください。

\`\`\`ts
function toUpperLabel(name: string): string {
  return \`【\${name}】\`;
}
\`\`\`

## 期待する挙動

- 受け取った文字列を \`【\` と \`】\` で挟んだ文字列を返します。
- 空の文字列を渡したときも、 かっこだけの文字列を返します。

## ポイント

- \`function 名前(...)\` を \`const 名前 = (...) =>\` に置き換えるだけです。 引数・型注釈・処理はそのまま使えます。
- アロー関数は **変数に関数を代入している** 形なので、 末尾にセミコロンが必要です。
- 中かっこを書いた場合は \`return\` も必要です。 書き忘れると何も返らない関数になります。
`,
  starterFiles: singleFile(
    `// 下のコメントの関数宣言と同じ働きをするアロー関数を、 同じ名前で書いてください。
//
// function toUpperLabel(name: string): string {
//   return \`【\${name}】\`;
// }

`,
    "main.ts",
  ),
  entryPoints: ["toUpperLabel"],
  demoCall: `console.log(toUpperLabel("コーヒー"));`,
  tests: [
    {
      name: 'toUpperLabel("コーヒー") は "【コーヒー】"',
      code: `toUpperLabel("コーヒー") === "【コーヒー】"`,
    },
    {
      name: 'toUpperLabel("田中") は "【田中】"',
      code: `toUpperLabel("田中") === "【田中】"`,
    },
    {
      name: "空文字ならかっこだけになる",
      code: `toUpperLabel("") === "【】"`,
    },
    {
      name: "関数として呼び出せる",
      code: `typeof toUpperLabel === "function"`,
    },
  ],
  hints: [
    "`function 名前(引数)` の部分だけを `const 名前 = (引数) =>` に置き換えます。 中かっこの中身は動かしません。",
    "戻り値の型注釈は引数のかっこのうしろ、 `=>` の手前に書きます。 文の終わりにセミコロンを忘れないでください。",
    "解答例:\n```ts\nconst toUpperLabel = (name: string): string => {\n  return `【${name}】`;\n};\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数で書く" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const toUpperLabel = (name: string): string => {
  return \`【\${name}】\`;
};
`,
  badSolutions: [
    {
      code: `const toUpperLabel = (name: string): string => {
  \`【\${name}】\`;
};
`,
      description:
        "中かっこを書いたのに return を書いていないため、 常に undefined が返る",
    },
  ],
  mdnSections: [{ heading: "アロー関数" }, { heading: "関数式" }],
};
