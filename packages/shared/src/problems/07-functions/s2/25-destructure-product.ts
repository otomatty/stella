import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07DestructureProduct: Assignment = {
  id: "S2-Ch07-461-destructure-product",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 25,
  title: "分割代入で必要なプロパティだけ取り出す",
  newConcept: "オブジェクトから名前で値を取り出す書き方",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  language: "typescript",
  description: `## やること

次のオブジェクトから、 **分割代入** で \`name\` と \`price\` を取り出してください。

\`\`\`ts
const product = { id: "P-001", name: "コーヒー", price: 480 };
\`\`\`

取り出した 2 つを使って、「〇〇は△△円です」の形の文字列を \`message\` という変数に入れてください。

## 期待する挙動

- \`name\` には商品名が、 \`price\` には価格が入ります。
- \`message\` は取り出した 2 つを並べた文字列になります。 \`product\` を書き換えてはいけません。
- \`id\` は使わないので取り出さなくて構いません。

## ポイント

- 分割代入は \`const { name, price } = product;\` のように書きます。 オブジェクトリテラルと形が似ていますが、 役割は逆 (作るのではなく取り出す) です。
- 対応するのは **プロパティ名** です。 並べる順番は関係ありませんが、 名前が違うと取り出せません。
- 必要なものだけ取り出せます。 使わないプロパティは書かなくて構いません。
`,
  starterFiles: singleFile(
    `const product = { id: "P-001", name: "コーヒー", price: 480 };

// 分割代入で name と price を取り出す


// 取り出した 2 つで「商品名は価格円です」の文字列を作り、 message に入れる

`,
    "main.ts",
  ),
  entryPoints: ["product", "name", "price", "message"],
  demoCall: `console.log(message);`,
  tests: [
    { name: "name に商品名が入っている", code: `name === "コーヒー"` },
    { name: "price に価格が入っている", code: `price === 480` },
    {
      name: "message が組み立てられている",
      code: `message === "コーヒーは480円です"`,
    },
    {
      name: "元のオブジェクトは変わっていない",
      code: `product.id === "P-001" && product.name === "コーヒー" && product.price === 480`,
    },
  ],
  hints: [
    "取り出したい変数名を中かっこで囲み、 その左辺にイコールでオブジェクトを置きます。 中かっこの中に書くのはプロパティ名です。",
    "取り出したあとは、 ふつうの変数と同じように使えます。 テンプレートリテラルで 2 つを並べてください。",
    '解答例:\n```ts\nconst product = { id: "P-001", name: "コーヒー", price: 480 };\n\nconst { name, price } = product;\n\nconst message = `${name}は${price}円です`;\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const product = { id: "P-001", name: "コーヒー", price: 480 };

const { name, price } = product;

const message = \`\${name}は\${price}円です\`;
`,
  badSolutions: [
    {
      code: `const product = { id: "P-001", name: "コーヒー", price: 480 };

const { productName, unitPrice } = product;

const message = \`\${productName}は\${unitPrice}円です\`;
`,
      description:
        "プロパティ名と違う名前を中かっこに書いたため、 どちらも undefined になる",
    },
  ],
  mdnSections: [
    {
      heading: "オブジェクトの構造分解",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring",
      pageTitle: "構造分解 (分割代入)",
    },
    {
      heading: "既定値",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring",
      pageTitle: "構造分解 (分割代入)",
    },
  ],
};
