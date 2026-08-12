import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch05NoteDefaultValue: Assignment = {
  id: "S1-Ch05-232-note-default-value",
  stage: "S1",
  chapterId: "Ch05",
  sequence: 4,
  title: "値がないときの既定値を 2 通りで書く",
  newConcept: "?? と if / else はどちらも「値がなければ既定値」を書ける",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

備考欄の値 \`note\` (型は \`string | undefined\`) を、 次のルールで表示してください。

- 値があれば、 そのまま表示する
- 値がなければ「備考なし」と表示する

備考は 2 件ぶん用意します。

| 意味 | 変数名 | 値 |
| --- | --- | --- |
| 1 件目 | \`note1\` | \`"領収書希望"\` |
| 2 件目 | \`note2\` | \`undefined\` |

**\`??\` を使う書き方と、 \`if\` / \`else\` を使う書き方の両方** を書いてください。 まず \`??\` で 2 件、 続いて \`if\` / \`else\` で 2 件の順に表示します。

## 期待する出力

\`\`\`
領収書希望
備考なし
領収書希望
備考なし
\`\`\`

## ポイント

- \`??\` は **左に値がなかったとき (\`null\` か \`undefined\` のとき) だけ右を使う** 演算子です。 左に本命、 右に既定値を書きます。
- どちらの書き方でも結果は同じです。 既定値を入れたいだけなら \`??\` のほうが短く、 意図も明確です。
- 値の有無で **処理そのもの** を変えたい場合は \`if\` を使います。
- \`if\` で書くときの条件は \`note !== undefined\` です。 \`undefined\` でないと確かめたブロックの中では、 型が \`string\` に確定します (絞り込み)。
`,
  starterFiles: singleFile(
    `// 1 件目の備考（"領収書希望"）を string | undefined 型で宣言する


// 2 件目の備考（undefined）を string | undefined 型で宣言する


// ?? を使う書き方で 2 件ぶん表示する


// if / else を使う書き方で 2 件ぶん表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "?? 版と if / else 版で同じ 2 行ずつが出力される",
      expectedStdout: "領収書希望\n備考なし\n領収書希望\n備考なし",
    },
  ],
  hints: [
    "`??` の書き方は `console.log(note1 ?? \"備考なし\");` です。 左に本命の値、 右に既定値を置きます。",
    "`if` の書き方では `note2 !== undefined` を条件にします。 条件に当たらなかったときが `else` の側で、 そこに「備考なし」を書きます。",
    '解答例:\n```ts\nconst note1: string | undefined = "領収書希望";\nconst note2: string | undefined = undefined;\n\n// ?? を使う書き方\nconsole.log(note1 ?? "備考なし");\nconsole.log(note2 ?? "備考なし");\n\n// if / else を使う書き方\nif (note1 !== undefined) {\n  console.log(note1);\n} else {\n  console.log("備考なし");\n}\n\nif (note2 !== undefined) {\n  console.log(note2);\n} else {\n  console.log("備考なし");\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const note1: string | undefined = "領収書希望";
const note2: string | undefined = undefined;

console.log(note1 ?? "備考なし");
console.log(note2 ?? "備考なし");

if (note1 !== undefined) {
  console.log(note1);
} else {
  console.log("備考なし");
}

if (note2 !== undefined) {
  console.log(note2);
} else {
  console.log("備考なし");
}
`,
  badSolutions: [
    {
      code: `const note1: string | undefined = "領収書希望";
const note2: string | undefined = undefined;

console.log("備考なし" ?? note1);
console.log("備考なし" ?? note2);

if (note1 !== undefined) {
  console.log(note1);
} else {
  console.log("備考なし");
}

if (note2 !== undefined) {
  console.log(note2);
} else {
  console.log("備考なし");
}
`,
      description:
        "?? の左右を取り違えて既定値を左に書いたため、 値があるときも常に「備考なし」が選ばれてしまう",
    },
  ],
  mdnSections: [{ heading: "条件文" }, { heading: "偽値" }],
};
