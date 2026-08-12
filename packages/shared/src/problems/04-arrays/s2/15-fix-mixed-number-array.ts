import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04FixMixedNumberArray: Assignment = {
  id: "S2-Ch04-312-fix-mixed-number-array",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 15,
  title: "number[] に紛れ込んだ文字列を直す",
  newConcept: "number[] は数値だけを並べる配列",
  estimatedMinutes: 9,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードはエラーになります。 エラーメッセージを読んで原因を確かめ、 直してください。

\`\`\`ts
const prices: number[] = [480, "500", 450];
console.log(prices);
\`\`\`

直したら、 確認のために **最初の 2 つの金額を足した結果** も表示してください。

## 期待する出力

\`\`\`
[480,500,450]
980
\`\`\`

## ポイント

- \`"500"\` はクォートで囲まれているので **文字列** です。 \`number[]\` は数値だけを並べる配列なので、「Type 'string' is not assignable to type 'number'.」というエラーになります。
- クォートを外して数値にすれば解決します。
- 足し算の結果でも見分けられます。 数値どうしなら \`480 + 500\` は \`980\` ですが、 片方が文字列だと連結されて \`480500\` になります。
- 数値と文字列が混ざる配列を作る方法は、 このあとのモジュールで扱います。 ここでは混ぜないのが正解です。
`,
  starterFiles: singleFile(
    `// このコードはエラーになる。 原因を直すこと。

const prices: number[] = [480, "500", 450];
console.log(prices);

// 直したら、 最初の 2 つの金額を足した結果も表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "数値だけの配列と、 足し算の結果が出力される",
      expectedStdout: "[480,500,450]\n980",
    },
  ],
  hints: [
    "エラーメッセージは、 配列の何番目の要素が合わないかまで教えてくれます。 その要素を見比べてください。",
    "型注釈のほうを広げて逃げないでください。 直すのは値の側です。 クォートを外します。",
    "解答例:\n```ts\nconst prices: number[] = [480, 500, 450];\nconsole.log(prices);\nconsole.log(prices[0] + prices[1]);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const prices: number[] = [480, 500, 450];
console.log(prices);
console.log(prices[0] + prices[1]);
`,
  badSolutions: [
    {
      code: `const prices: (number | string)[] = [480, "500", 450];
console.log(prices);
console.log(prices[0] + prices[1]);
`,
      description:
        "値ではなく型注釈のほうを広げてエラーだけ消したため、 文字列が残ったままで足し算が連結になってしまう",
    },
  ],
  mdnSections: [{ heading: "配列の生成" }, { heading: "配列要素の参照" }],
};
