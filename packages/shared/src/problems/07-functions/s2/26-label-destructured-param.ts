import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07LabelDestructuredParam: Assignment = {
  id: "S2-Ch07-462-label-destructured-param",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 26,
  title: "分割代入引数でオブジェクトを受け取る",
  newConcept: "引数の位置に中かっこを書き、 オブジェクト全体に型を付ける",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

商品を表す型 \`Product\` を用意し、 その型のオブジェクトを **1 つ** 受け取って「コーヒー(480円)」の形の文字列を返す関数 \`label\` を、 **分割代入引数** で書いてください。

\`\`\`ts
type Product = { name: string; price: number };
\`\`\`

\`\`\`ts
label({ name: "コーヒー", price: 480 }); // → "コーヒー(480円)"
\`\`\`

かっこは **半角** です。

## 期待する挙動

- 受け取るのはオブジェクト 1 つです。 商品名と価格を別々の引数で受け取る形にしてはいけません。
- 商品名のうしろに、 半角かっこで囲んだ「価格 + 円」が続きます。
- 価格が \`0\` の商品でも同じ形の文字列を返します。

## ポイント

- 分割代入引数は \`({ name, price }: Product)\` のように、 引数の位置に中かっこを書き、 そのうしろに型を付けます。
- 型は個々の変数ではなく、 **オブジェクト全体** に対して付けます。
- 関数の中では、 取り出した \`name\` と \`price\` をふつうの変数として使えます。
`,
  starterFiles: singleFile(
    `// 商品の型 Product を作る (商品名と価格を持つ)


// Product のオブジェクトを 1 つ受け取り、「商品名(価格円)」を返す関数 label を
// 分割代入引数で書く

`,
    "main.ts",
  ),
  entryPoints: ["label"],
  demoCall: `console.log(label({ name: "コーヒー", price: 480 }));`,
  tests: [
    {
      name: 'label({ name: "コーヒー", price: 480 }) は "コーヒー(480円)"',
      code: `label({ name: "コーヒー", price: 480 }) === "コーヒー(480円)"`,
    },
    {
      name: "別の商品でも同じ形になる",
      code: `label({ name: "紅茶", price: 500 }) === "紅茶(500円)"`,
    },
    {
      name: "価格が 0 でも同じ形になる",
      code: `label({ name: "試供品", price: 0 }) === "試供品(0円)"`,
    },
    {
      name: "プロパティの順番が違っても動く",
      code: `label({ price: 450, name: "緑茶" }) === "緑茶(450円)"`,
    },
  ],
  hints: [
    "まず `type` でオブジェクトの型に名前を付けます。 プロパティは商品名と価格の 2 つです。",
    "引数のかっこの中に、 さらに中かっこを書いて取り出したいプロパティ名を並べます。 型はその中かっこ全体のうしろに書きます。",
    '解答例:\n```ts\ntype Product = { name: string; price: number };\n\nconst label = ({ name, price }: Product): string => {\n  return `${name}(${price}円)`;\n};\n```',
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `type Product = { name: string; price: number };

const label = ({ name, price }: Product): string => {
  return \`\${name}(\${price}円)\`;
};
`,
  badSolutions: [
    {
      code: `type Product = { name: string; price: number };

const label = (name: string, price: number): string => {
  return \`\${name}(\${price}円)\`;
};
`,
      description:
        "オブジェクト 1 つではなく引数 2 つで受け取っているため、 呼び出すと 1 つ目にオブジェクトが入り 2 つ目が undefined になる",
    },
  ],
  mdnSections: [
    {
      heading: "関数の引数として渡されたオブジェクトからのプロパティの展開",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring",
      pageTitle: "構造分解 (分割代入)",
    },
    { heading: "関数の引数" },
  ],
};
