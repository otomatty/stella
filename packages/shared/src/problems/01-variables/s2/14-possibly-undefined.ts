import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01PossiblyUndefined: Assignment = {
  id: "S2-Ch01-163-possibly-undefined",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 14,
  title: "possibly undefined を止めてくれる理由",
  newConcept: "値がないかもしれない変数をそのまま使うと、実行前に止めてもらえる",
  estimatedMinutes: 7,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードはエラーになります。 修正は不要です (直し方は次のモジュールで学びます)。

\`\`\`ts
const nickname: string | undefined = undefined;
console.log(nickname.length);
\`\`\`

なぜコンパイラーがこのコードを止めてくれるのでしょうか。 もっとも近いものを 1 つ選び、 **その記号だけ** を \`console.log\` で表示してください。

- A. \`nickname\` には \`undefined\` が入っている可能性があり、 \`undefined\` には \`length\` がないから
- B. \`undefined\` の \`length\` は \`0\` として扱われるはずなのに、 TypeScript がその扱いに対応していないから
- C. ユニオン型 (\`string | undefined\`) にした変数には、 \`.length\` のようなプロパティを一切書けない決まりだから

## 期待する出力

\`\`\`
A
\`\`\`

## ポイント

- \`nickname\` の型は \`string | undefined\` なので、 \`undefined\` が入っている可能性があります。 \`undefined\` には \`length\` がないため、 そのまま使うと実行時にエラーになります。
- \`strict\` (正確には \`strictNullChecks\`) が有効だと、 コンパイラーがこの危険を実行前に検出してくれます。
- JavaScript でいちばん有名な実行時エラー「Cannot read properties of undefined」を、 書いている最中に潰せるということです。
- \`undefined\` は空文字 \`""\` とは違い、 \`length\` を持ちません。 また、 ユニオン型そのものが禁止されているわけでもありません。 \`undefined\` でないと確かめたあとなら \`.length\` を書けます (確かめ方は次のモジュールで学びます)。
`,
  starterFiles: singleFile(
    `// A / B / C から 1 つ選び、 その記号だけを console.log で表示してください

`,
    "main.ts",
  ),
  tests: [
    {
      name: "選んだ記号 1 文字が出力される",
      expectedStdout: "A",
    },
  ],
  hints: [
    "エラーメッセージは「'nickname' is possibly 'undefined'.」です。 何が「possibly」なのかを読み取ってください。",
    "`undefined` は「空の文字列」ではなく「値がない」ことです。 空文字 `\"\"` なら `length` は `0` ですが、 `undefined` には `length` そのものがありません。",
    '解答例:\n```ts\nconsole.log("A");\n```',
  ],
  solution: `console.log("A");
`,
  badSolutions: [
    {
      code: `console.log("B");
`,
      description:
        "undefined を空文字と同じように扱えると思い込んでいる（undefined には length がない）",
    },
  ],
  mdnSections: [{ heading: "データ型" }, { heading: "変数の宣言" }],
};
