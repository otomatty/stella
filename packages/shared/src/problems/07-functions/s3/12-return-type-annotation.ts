import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07ReturnTypeAnnotation: Assignment = {
  id: "S3-Ch07-443-return-type-annotation",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 12,
  title: "エラーが呼び出し側で出る理由を直す",
  newConcept: "戻り値の型注釈を書くと、 実装ミスを関数の中で止められる",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

次のコードは、 エラーが \`calcDiscount\` の **中ではなく呼び出し側** で出ます。 **関数の中でエラーが出るように** 直してください。

\`\`\`ts
const calcDiscount = (price: number) => {
  return \`\${price * 0.8}\`;
};

const discounted: number = calcDiscount(1000);
\`\`\`

戻り値の型注釈がないため、 コンパイラーは「文字列を返す関数」だと推論します。 関数の中では矛盾がないので通ってしまい、 \`number\` 型の変数に代入しようとした呼び出し側で初めてエラーになります。

**\`calcDiscount\` は数値を返す関数** です。 戻り値の型を宣言し、 実装もそれに合わせてください。

## 期待する挙動

- \`calcDiscount\` は「価格 × 0.8」の結果を **数値** で返します。 文字列ではありません。
- \`discounted\` には \`calcDiscount(1000)\` の結果が数値として入ります。

## ポイント

- 戻り値の型を書いておけば、 \`return\` の時点で止まります。 エラーの出た場所と直す場所が一致するので、 原因がすぐ分かります。
- テンプレートリテラル (\`\` \`\${...}\` \`\`) で包むと、 中身が数値でも結果は **文字列** になります。
- \`800\` と \`"800"\` は見た目が似ていても別の値です。 直っているかどうかは型で判定されます。
- 呼び出し側の変数の型注釈を \`string\` に変えるのは、 直したことになりません。 それは「間違ったほうに合わせた」だけで、 関数は依然として文字列を返しています。
`,
  starterFiles: singleFile(
    `// エラーが呼び出し側ではなく関数の中で出るように直してください。
// calcDiscount は数値を返す関数です。

const calcDiscount = (price: number) => {
  return \`\${price * 0.8}\`;
};

const discounted: number = calcDiscount(1000);
`,
    "main.ts",
  ),
  entryPoints: ["calcDiscount", "discounted"],
  demoCall: `console.log(discounted);`,
  tests: [
    { name: "discounted は数値の 800", code: `discounted === 800` },
    {
      name: "calcDiscount(500) は数値の 400",
      code: `calcDiscount(500) === 400`,
    },
    {
      name: "返ってくる値の型は number",
      code: `typeof calcDiscount(2400) === "number"`,
    },
    { name: "calcDiscount(0) は 0", code: `calcDiscount(0) === 0` },
  ],
  hints: [
    "まず、 いまの関数が何を返しているかを確かめてください。 計算そのものは合っていますが、 返すときに別の型へ変わっています。",
    "引数のかっこのうしろに戻り値の型を書き足すと、 `return` の行で矛盾が検出されます。 その矛盾が出ないように `return` の書き方も直してください。",
    "解答例:\n```ts\nconst calcDiscount = (price: number): number => {\n  return price * 0.8;\n};\n\nconst discounted: number = calcDiscount(1000);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const calcDiscount = (price: number): number => {
  return price * 0.8;
};

const discounted: number = calcDiscount(1000);
`,
  badSolutions: [
    {
      code: `const calcDiscount = (price: number) => {
  return \`\${price * 0.8}\`;
};

const discounted: string = calcDiscount(1000);
`,
      description:
        "呼び出し側の型注釈を string に変えて辻褄を合わせただけで、 関数は文字列を返したまま",
    },
  ],
  mdnSections: [{ heading: "関数の定義" }, { heading: "関数の呼び出し" }],
};
