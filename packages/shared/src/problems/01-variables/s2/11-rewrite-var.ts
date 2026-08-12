import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01RewriteVar: Assignment = {
  id: "S2-Ch01-113-rewrite-var",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 11,
  title: "var を書き直して二度宣言に気づく",
  newConcept: "var は同じ名前の二度宣言を黙って許してしまう",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは \`var\` で書かれています。 \`const\` と \`let\` を使って書き直してください。 書き直すと、 元のコードに潜んでいた問題が 1 つ表面化します。

\`\`\`ts
var storeName = "青山店";
var storeName = "渋谷店";
console.log(storeName);
\`\`\`

このコードは本当は **2 つの店舗名を扱いたかった** ものでした。 ところが同じ名前で二度宣言していたため、「青山店」が静かに消えていました。 **別々の名前の変数** を用意して、「青山店」と「渋谷店」の両方を順に表示できるように直してください。

## 期待する出力

\`\`\`
青山店
渋谷店
\`\`\`

## ポイント

- \`var\` では同じ名前で二度宣言してもエラーになりません。 そのため元のコードでは 1 行目の「青山店」が静かに上書きされ、 意図せず消えていました。
- \`const\` や \`let\` に書き直すと「Cannot redeclare block-scoped variable 'storeName'.」というエラーになり、 二度宣言していることに実行前に気づけます。
- 2 つの値を扱いたいなら、 変数も 2 つ必要です。 どちらも変わらない値なので \`const\` で宣言します。
`,
  starterFiles: singleFile(
    `// var で書かれたコード。 2 つの店舗名を両方扱えるように const / let で書き直してください
var storeName = "青山店";
var storeName = "渋谷店";
console.log(storeName);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "2 つの店舗名が順に出力される",
      expectedStdout: "青山店\n渋谷店",
    },
  ],
  hints: [
    "`var` をそのまま `const` に置き換えると、 二度宣言していることがエラーとして表面化します。",
    "同じ名前を 2 回使うのをやめて、 `aoyamaStoreName` と `shibuyaStoreName` のように別々の名前にします。",
    '解答例:\n```ts\nconst aoyamaStoreName = "青山店";\nconst shibuyaStoreName = "渋谷店";\n\nconsole.log(aoyamaStoreName);\nconsole.log(shibuyaStoreName);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const aoyamaStoreName = "青山店";
const shibuyaStoreName = "渋谷店";

console.log(aoyamaStoreName);
console.log(shibuyaStoreName);
`,
  badSolutions: [
    {
      code: `var storeName = "青山店";
var storeName = "渋谷店";
console.log(storeName);
console.log(storeName);
`,
      description:
        "var の二度宣言を残したまま表示だけ 2 回にしており、 上書きされた「渋谷店」が 2 行出る",
    },
  ],
  mdnSections: [{ heading: "変数の宣言" }, { heading: "定数" }],
};
