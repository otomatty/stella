import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09InStockLabels: Assignment = {
  id: "S3-Ch09-453-in-stock-labels",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 9,
  title: "filter と map をつなげて絞り込みと変換をする",
  newConcept: "先に絞ってから変換する。 メソッドチェーン",
  estimatedMinutes: 15,
  difficulty: 3,
  testKind: "function",
  language: "typescript",
  description: `## やること

商品の配列を受け取り、 **在庫がある商品だけ** を取り出して **「商品名: 価格円」の文字列の配列** に変換する関数 \`inStockLabels\` を作ってください。 \`filter\` と \`map\` を **つなげて** 書いてください。

\`\`\`ts
type Product = { name: string; price: number; inStock: boolean };

inStockLabels([
  { name: "コーヒー", price: 480, inStock: true },
  { name: "紅茶", price: 500, inStock: false },
  { name: "緑茶", price: 450, inStock: true },
]);
// → ["コーヒー: 480円", "緑茶: 450円"]
\`\`\`

商品名とコロンのあとには **半角スペースが 1 つ** 入ります。

## 期待する挙動

- 在庫が \`false\` の商品は結果に現れません。
- 残った商品は元の並び順のまま、 文字列に変換されます。
- 在庫のある商品が 1 つも無ければ、 空の配列を返します。

## ポイント

- \`filter\` を **先** に置くのがポイントです。 先に絞っておけば、 \`map\` が処理する件数が減ります。
- 順番を逆にすると、 \`map\` が作った **文字列** に対して在庫を調べることになり、 何も残りません。
- \`filter\` のコールバックには \`product.inStock\` をそのまま返せます。 これは真偽値のプロパティなので、 比較演算子を書く必要がありません。
- \`filter\` も \`map\` も新しい配列を返すので、 ドットでつなげて書けます。
`,
  starterFiles: singleFile(
    `// 商品の型 Product を作る (商品名・価格・在庫の有無)


// Product の配列を受け取り、 在庫がある商品だけを「商品名: 価格円」に変換した
// 文字列の配列を返す関数 inStockLabels を作る (filter と map をつなげる)

`,
    "main.ts",
  ),
  entryPoints: ["inStockLabels"],
  demoCall: `console.log(inStockLabels([{ name: "コーヒー", price: 480, inStock: true }, { name: "紅茶", price: 500, inStock: false }]));`,
  tests: [
    {
      name: "在庫のある 2 件だけがラベルになる",
      code: `JSON.stringify(inStockLabels([{ name: "コーヒー", price: 480, inStock: true }, { name: "紅茶", price: 500, inStock: false }, { name: "緑茶", price: 450, inStock: true }])) === '["コーヒー: 480円","緑茶: 450円"]'`,
    },
    {
      name: "全件在庫ありなら全件がラベルになる",
      code: `JSON.stringify(inStockLabels([{ name: "水", price: 120, inStock: true }, { name: "麦茶", price: 130, inStock: true }])) === '["水: 120円","麦茶: 130円"]'`,
    },
    {
      name: "在庫が 1 件も無ければ空の配列",
      code: `(() => { const r = inStockLabels([{ name: "紅茶", price: 500, inStock: false }]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "空の配列を渡しても空の配列",
      code: `(() => { const r = inStockLabels([]); return Array.isArray(r) && r.length === 0; })()`,
    },
  ],
  hints: [
    "処理は 2 段階です。 まず残すものを決め、 そのあとで残ったものを文字列に変えます。 この順番を逆にしてはいけません。",
    "在庫の判定はプロパティをそのまま返すだけで足ります。 変換のほうはテンプレートリテラルとドット記法を組み合わせます。",
    '解答例:\n```ts\ntype Product = { name: string; price: number; inStock: boolean };\n\nconst inStockLabels = (products: Product[]): string[] => {\n  return products\n    .filter((product) => product.inStock)\n    .map((product) => `${product.name}: ${product.price}円`);\n};\n```',
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "filter", label: "filter を使う" },
        { kind: "method", name: "map", label: "map を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `type Product = { name: string; price: number; inStock: boolean };

const inStockLabels = (products: Product[]): string[] => {
  return products
    .filter((product) => product.inStock)
    .map((product) => \`\${product.name}: \${product.price}円\`);
};
`,
  badSolutions: [
    {
      code: `type Product = { name: string; price: number; inStock: boolean };

const inStockLabels = (products: Product[]) => {
  return products
    .map((product) => \`\${product.name}: \${product.price}円\`)
    .filter((product) => product.inStock);
};
`,
      description:
        "map を先に置いたため、 文字列になったあとで在庫を調べることになり 1 件も残らない",
    },
  ],
  mdnSections: [{ heading: "反復処理メソッド" }, { heading: "インスタンスメソッド" }],
};
