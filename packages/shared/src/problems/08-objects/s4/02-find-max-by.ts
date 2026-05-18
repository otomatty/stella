import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch08FindMaxBy: Assignment = {
  id: "S4-Ch08-02-find-max-by",
  stage: "S4",
  chapterId: "Ch08",
  sequence: 2,
  title: "指定フィールドが最大のオブジェクトを返す",
  newConcept: "オブジェクト配列を 1 周しながら「現在のベスト」 を更新する状態保持ループ",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

商品オブジェクトの配列 \`items\` と、 比較に使う数値フィールド名 \`field\` を受け取り、 \`item[field]\` が **最大** の **アイテムオブジェクトそのもの** を返す関数 \`findMaxBy\` を実装してください。

- 同点がある場合は **先に登場したもの** を優先する (先勝ち)。
- 空配列の場合は \`undefined\` を返す。

\`\`\`js
findMaxBy(
  [
    { name: "Apple",  price: 100 },
    { name: "Banana", price: 300 },
    { name: "Cherry", price: 200 },
  ],
  "price",
);
// → { name: "Banana", price: 300 }

findMaxBy(
  [
    { name: "A", sold: 5 },
    { name: "B", sold: 5 },
  ],
  "sold",
);
// → { name: "A", sold: 5 }   (同点は先勝ち)

findMaxBy([], "price");   // → undefined
\`\`\`

## ポイント

- 「現在のベスト」 を表す変数 \`best\` を \`let\` で持ち、 ループの中で **\`item[field] > best[field]\` なら更新** します。
- 同点を **先勝ち** にしたいので、 比較は \`>=\` ではなく **\`>\`** を使うのがポイントです。
- 空配列のときは return する best が存在しないので、 **最初に空配列ガード** を入れて \`undefined\` を返してください。
- S4 では \`sort\` などで全件並べ替えてから先頭を取る、 のような手段は \`AST forbidden\` でブロックしています。
`,
  starterFiles: singleFile(`function findMaxBy(items, field) {
  // 1) 空配列なら undefined を返す
  // 2) best = items[0] から始めて、 ループで item[field] > best[field] なら best を更新
  // 3) ループ後に best を返す
}
`),
  entryPoints: ["findMaxBy"],
  demoCall: `console.log(findMaxBy([{ price: 100 }, { price: 300 }, { price: 200 }], "price"));`,
  tests: [
    {
      name: "price が最大のアイテムを返す",
      code: `(() => {
        const r = findMaxBy([
          { name: "Apple",  price: 100 },
          { name: "Banana", price: 300 },
          { name: "Cherry", price: 200 },
        ], "price");
        return r && r.name === "Banana" && r.price === 300;
      })()`,
    },
    {
      name: "別フィールド (sold) でも動く",
      code: `(() => {
        const r = findMaxBy([
          { name: "A", sold: 1 },
          { name: "B", sold: 10 },
          { name: "C", sold: 3 },
        ], "sold");
        return r && r.name === "B";
      })()`,
    },
    {
      name: "同点は先に登場したものを返す (先勝ち)",
      code: `(() => {
        const r = findMaxBy([
          { name: "A", sold: 5 },
          { name: "B", sold: 5 },
        ], "sold");
        return r && r.name === "A";
      })()`,
    },
    {
      name: "空配列なら undefined",
      code: `findMaxBy([], "price") === undefined`,
    },
    {
      name: "1 件だけならその要素",
      code: `(() => {
        const r = findMaxBy([{ name: "only", price: 7 }], "price");
        return r && r.name === "only";
      })()`,
    },
    {
      name: "負の数を含んでも正しい",
      code: `(() => {
        const r = findMaxBy([
          { x: -5 },
          { x: -1 },
          { x: -10 },
        ], "x");
        return r && r.x === -1;
      })()`,
    },
    {
      name: "戻り値は元のオブジェクトの参照 (新しいオブジェクトを作らない)",
      code: `(() => {
        const a = { price: 10 };
        const b = { price: 20 };
        return findMaxBy([a, b], "price") === b;
      })()`,
    },
  ],
  hints: [
    "if (items.length === 0) return undefined; let best = items[0]; for (const item of items) { if (item[field] > best[field]) best = item; } return best;",
    "解答例:\n```js\nfunction findMaxBy(items, field) {\n  if (items.length === 0) {\n    return undefined;\n  }\n  let best = items[0];\n  for (const item of items) {\n    if (item[field] > best[field]) {\n      best = item;\n    }\n  }\n  return best;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で最大のアイテムを返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of でアイテムを走査する" },
        { kind: "node", nodeType: "IfStatement", label: "if で空配列ガード or ベスト更新の分岐を書く" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S4 では filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "sort", label: "sort で全件並べ替えてから先頭を取る安易解を避ける" },
      ],
    },
  },
  solution: `function findMaxBy(items, field) {
  if (items.length === 0) {
    return undefined;
  }
  let best = items[0];
  for (const item of items) {
    if (item[field] > best[field]) {
      best = item;
    }
  }
  return best;
}
`,
  badSolutions: [
    {
      code: `function findMaxBy(items, field) {
  return [...items].sort((a, b) => b[field] - a[field])[0];
}
`,
      description: "sort で全件並べ替えてから先頭を取っている (AST forbidden 違反)",
    },
    {
      code: `function findMaxBy(items, field) {
  let best = items[0];
  for (const item of items) {
    if (item[field] >= best[field]) {
      best = item;
    }
  }
  return best;
}
`,
      description: ">= で更新しており同点が後勝ちになる (先勝ちテスト失敗) + 空配列ガードがない",
    },
    {
      code: `function findMaxBy(items, field) {
  if (items.length === 0) {
    return undefined;
  }
  let best = items[0];
  for (const item of items) {
    if (item.price > best.price) {
      best = item;
    }
  }
  return best;
}
`,
      description: "field 引数を使わず price 固定で比較している (別フィールドテストで失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "ブラケット記法",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Property_accessors#bracket_notation",
      pageTitle: "プロパティアクセサー",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
