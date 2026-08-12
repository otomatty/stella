import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05NarrowCouponCode: Assignment = {
  id: "S2-Ch05-233-narrow-coupon-code",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 17,
  title: "undefined かもしれない値を絞り込んでから使う",
  newConcept: "if で undefined を除くと、 そのブロックの中では型が確定する",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 クーポンコードとその文字数を表示したいものです。 しかし 2 行目の表示で実行が止まってしまいます。

\`\`\`ts
const codeA: string | undefined = "SPRING10";
const codeB: string | undefined = undefined;

console.log(\`\${codeA} (\${codeA.length}文字)\`);
console.log(\`\${codeB} (\${codeB.length}文字)\`);
\`\`\`

コンパイラーも \`.length\` のところでエラーを出しています。 エラーメッセージを読み、 **\`if\` で絞り込んでから使う** 形に直してください。 コードが無いときは「クーポンなし」と表示します。

## 期待する出力

\`\`\`
SPRING10 (8文字)
クーポンなし
\`\`\`

## ポイント

- \`codeA\` / \`codeB\` の型は \`string | undefined\` です。 値が入っているように見えても、 **型の上では \`undefined\` の可能性が残っている** ため、 そのまま \`.length\` を読むことはできません。
- コンパイラーが止めてくれる理由は、 実行時に本当に壊れるからです。 \`undefined\` には \`length\` がありません。
- \`if (code !== undefined)\` で確かめると、 **そのブロックの中では型が \`string\` に確定** します。 これを絞り込みと呼びます。
- \`?? ""\` で空文字を入れて黙らせることもできますが、 それでは「コードが無い」という事実が空文字にすり替わり、 「クーポンなし」を表示できません。
`,
  starterFiles: singleFile(
    `// 2 行目の表示で実行が止まる。 if で絞り込んでから使う形に直すこと。
// コードが無いときは「クーポンなし」と表示する。

const codeA: string | undefined = "SPRING10";
const codeB: string | undefined = undefined;

console.log(\`\${codeA} (\${codeA.length}文字)\`);
console.log(\`\${codeB} (\${codeB.length}文字)\`);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "値があるほうは文字数付き、 無いほうはクーポンなしが出力される",
      expectedStdout: "SPRING10 (8文字)\nクーポンなし",
    },
  ],
  hints: [
    "`.length` を読んでよいのは、 値が `undefined` でないと分かっているときだけです。 表示の行を `if` のブロックの中に入れます。",
    "条件は `codeA !== undefined` です。 当たらなかったとき（`else` の側）に「クーポンなし」を表示します。 同じ形を `codeB` にも書きます。",
    '解答例:\n```ts\nconst codeA: string | undefined = "SPRING10";\nconst codeB: string | undefined = undefined;\n\nif (codeA !== undefined) {\n  console.log(`${codeA} (${codeA.length}文字)`);\n} else {\n  console.log("クーポンなし");\n}\n\nif (codeB !== undefined) {\n  console.log(`${codeB} (${codeB.length}文字)`);\n} else {\n  console.log("クーポンなし");\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const codeA: string | undefined = "SPRING10";
const codeB: string | undefined = undefined;

if (codeA !== undefined) {
  console.log(\`\${codeA} (\${codeA.length}文字)\`);
} else {
  console.log("クーポンなし");
}

if (codeB !== undefined) {
  console.log(\`\${codeB} (\${codeB.length}文字)\`);
} else {
  console.log("クーポンなし");
}
`,
  badSolutions: [
    {
      code: `const codeA: string | undefined = "SPRING10";
const codeB: string | undefined = undefined;

const a = codeA ?? "";
const b = codeB ?? "";

console.log(\`\${a} (\${a.length}文字)\`);
console.log(\`\${b} (\${b.length}文字)\`);
`,
      description:
        "?? で空文字を入れてエラーだけ消したため、 コードが無い場合も「クーポンなし」ではなく 0 文字として表示されてしまう",
    },
  ],
  mdnSections: [{ heading: "条件文" }, { heading: "偽値" }],
};
