import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch04PopularProductsCapstone: Assignment = {
  id: "S5-Ch04-03-popular-products-capstone",
  stage: "S5",
  chapterId: "Ch04",
  sequence: 3,
  title: "[卒業課題] 購入ログから人気商品ランキングを集計する",
  newConcept:
    "ログを 1 周走査して 「商品ごとの状態」 を集計し、 配列パイプライン (entries → map → sort → slice) で最終形に整える、 アルゴリズム + 設計の統合演習",
  estimatedMinutes: 80,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

購入ログの配列 \`transactions\` (各要素は \`{ userId, productId }\` の形) と上限件数 \`topN\` を受け取り、 **商品 ID ごとの集計** を以下の仕様で返す関数 \`popularProductsRanking\` を実装してください。

各要素は \`{ productId, purchases, uniqueUsers }\` の形:

- \`purchases\` — その商品が登場した **延べ購入件数** (同じユーザーが複数回買った場合もすべて数える)
- \`uniqueUsers\` — その商品を購入した **ユニークなユーザー数** (重複は 1 件として数える)
- 並び順: \`purchases\` の **降順**、 同数なら \`productId\` の **昇順 (文字列の辞書順)**
- 上位 \`topN\` 件のみ返す。 \`topN <= 0\` なら \`[]\`
- 入力 \`transactions\` が空のときは \`[]\`

\`\`\`js
popularProductsRanking(
  [
    { userId: "u1", productId: "p1" },
    { userId: "u2", productId: "p1" },
    { userId: "u1", productId: "p2" },
    { userId: "u1", productId: "p1" },
  ],
  2,
);
// → [
//     { productId: "p1", purchases: 3, uniqueUsers: 2 },
//     { productId: "p2", purchases: 1, uniqueUsers: 1 },
//   ]

popularProductsRanking([], 5);    // → []
popularProductsRanking([{ userId: "u1", productId: "x" }], 0); // → []
\`\`\`

## ポイント

- これは **S5 卒業課題のひとつ**。 「ログ走査 + オブジェクト集計 + 配列パイプライン + 検索」 という S5 全体のコアパターンを 1 問にまとめた統合演習です。
- 推奨フロー:
  1. 集計用オブジェクト \`stats = {}\` を用意する。 値は \`{ purchases: 0, users: [] }\` を初期形にする
  2. \`for...of\` で 1 件ずつログを処理する:
     - その \`productId\` が \`stats\` に未登場なら初期化
     - \`purchases\` を +1
     - **\`users\` 配列に \`userId\` がまだ含まれていなければ \`push\`** (\`includes\` でユニーク判定)
  3. \`Object.entries(stats)\` で \`[productId, { purchases, users }]\` の配列にし、 \`.map(...)\` で \`{ productId, purchases, uniqueUsers: users.length }\` の最終形に整形する
  4. \`.sort((a, b) => b.purchases - a.purchases || a.productId.localeCompare(b.productId))\` で 2 段ソート
  5. \`.slice(0, Math.max(0, topN))\` で上位 N 件を切り出す
- 学習目標:
  - **配列を状態として使う** (\`users[]\` を \`includes\` でユニーク判定しながら成長させる)
  - **集計データを「最終形」 に整形してから検索 (sort + slice)** という、 ステップを分けた設計
  - AST で **\`map\` / \`includes\` / \`sort\` / \`slice\` の使用** を必須にしています
`,
  starterFiles: singleFile(`function popularProductsRanking(transactions, topN) {
  // 商品 ID をキーにする集計用オブジェクトを 1 つ用意する


  // for...of で transactions を 1 周し、 未登場の商品は集計オブジェクトに初期化して登録する


  // 各ログで延べ購入件数を 1 つ増やす


  // ユニーク判定用の配列に includes でユーザーが含まれていなければ追加する


  // 集計オブジェクトを Object.entries で配列化し、 map で説明文の出力要素形に整える


  // sort で延べ購入件数の降順 + 商品 ID の昇順 (localeCompare) の 2 段ソートに並べ替える


  // slice で上位 topN 件 (負値は 0 件扱い) に切り出して return する
}
`),
  entryPoints: ["popularProductsRanking"],
  demoCall: `console.log(popularProductsRanking([
  { userId: "u1", productId: "p1" },
  { userId: "u2", productId: "p1" },
  { userId: "u1", productId: "p2" },
  { userId: "u1", productId: "p1" },
], 2));`,
  tests: [
    {
      name: "purchases 降順、 uniqueUsers も正しい (4 件の例)",
      code: `JSON.stringify(popularProductsRanking([{ userId: "u1", productId: "p1" }, { userId: "u2", productId: "p1" }, { userId: "u1", productId: "p2" }, { userId: "u1", productId: "p1" }], 2)) === JSON.stringify([{ productId: "p1", purchases: 3, uniqueUsers: 2 }, { productId: "p2", purchases: 1, uniqueUsers: 1 }])`,
    },
    {
      name: "同じユーザーが同じ商品を 3 回買っても uniqueUsers は 1",
      code: `(() => { const r = popularProductsRanking([{ userId: "u1", productId: "p1" }, { userId: "u1", productId: "p1" }, { userId: "u1", productId: "p1" }], 1)[0]; return r.purchases === 3 && r.uniqueUsers === 1; })()`,
    },
    {
      name: "空ログでは空配列を返す",
      code: `JSON.stringify(popularProductsRanking([], 5)) === JSON.stringify([])`,
    },
    {
      name: "topN が 0 なら空配列",
      code: `JSON.stringify(popularProductsRanking([{ userId: "u1", productId: "x" }], 0)) === JSON.stringify([])`,
    },
    {
      name: "topN が負でも空配列 (エラーにならない)",
      code: `JSON.stringify(popularProductsRanking([{ userId: "u1", productId: "x" }], -1)) === JSON.stringify([])`,
    },
    {
      name: "purchases 同数のタイブレークは productId 昇順 (入力順は逆)",
      code: `JSON.stringify(popularProductsRanking([{ userId: "u1", productId: "z" }, { userId: "u1", productId: "a" }], 2)) === JSON.stringify([{ productId: "a", purchases: 1, uniqueUsers: 1 }, { productId: "z", purchases: 1, uniqueUsers: 1 }])`,
    },
    {
      name: "topN が登場商品数より多いとき、 登場全件を返す",
      code: `popularProductsRanking([{ userId: "u1", productId: "p1" }, { userId: "u1", productId: "p2" }], 10).length === 2`,
    },
    {
      name: "戻り値は配列",
      code: `Array.isArray(popularProductsRanking([{ userId: "u1", productId: "x" }], 1))`,
    },
    {
      name: "各要素は { productId, purchases, uniqueUsers } のキーを持つ",
      code: `(() => { const r = popularProductsRanking([{ userId: "u1", productId: "x" }], 1)[0]; return typeof r.productId === "string" && typeof r.purchases === "number" && typeof r.uniqueUsers === "number"; })()`,
    },
    {
      name: "uniqueUsers <= purchases が常に成り立つ",
      code: `(() => { const r = popularProductsRanking([{ userId: "u1", productId: "p1" }, { userId: "u2", productId: "p1" }, { userId: "u1", productId: "p1" }, { userId: "u3", productId: "p2" }, { userId: "u3", productId: "p2" }], 5); return r.every((x) => x.uniqueUsers <= x.purchases); })()`,
    },
    {
      name: "5 商品 + 多様なユーザーの混在で上位 3 件を抽出",
      code: `(() => { const txs = [{ userId: "u1", productId: "a" }, { userId: "u2", productId: "a" }, { userId: "u3", productId: "a" }, { userId: "u1", productId: "b" }, { userId: "u1", productId: "b" }, { userId: "u2", productId: "c" }, { userId: "u3", productId: "d" }, { userId: "u3", productId: "d" }, { userId: "u3", productId: "d" }, { userId: "u1", productId: "e" }]; const r = popularProductsRanking(txs, 3); return r.length === 3 && r[0].productId === "a" && r[0].purchases === 3 && r[0].uniqueUsers === 3 && r[1].productId === "d" && r[1].purchases === 3 && r[1].uniqueUsers === 1; })()`,
    },
    {
      name: "上位 3 件目は purchases 同数なら productId 昇順 (b vs e のうち b)",
      code: `(() => { const txs = [{ userId: "u1", productId: "a" }, { userId: "u2", productId: "a" }, { userId: "u3", productId: "a" }, { userId: "u1", productId: "b" }, { userId: "u1", productId: "b" }, { userId: "u2", productId: "c" }, { userId: "u3", productId: "d" }, { userId: "u3", productId: "d" }, { userId: "u3", productId: "d" }, { userId: "u1", productId: "e" }]; const r = popularProductsRanking(txs, 3); return r[2].productId === "b"; })()`,
    },
  ],
  hints: [
    "stats[productId] が未定義のときに 「初期化」 する典型イディオム: if (!stats[productId]) { stats[productId] = { purchases: 0, users: [] }; } を for ループの先頭で書きます。",
    "この問題は AST で includes の使用を必須にしています。 ユニークユーザー判定は users.includes(userId) === false のとき users.push(userId) する形で実装してください (配列での状態管理を練習する意図のため、 Set ベースの実装は採点で通りません)。",
    "解答例:\n```js\nfunction popularProductsRanking(transactions, topN) {\n  const stats = {};\n  for (const t of transactions) {\n    if (!stats[t.productId]) {\n      stats[t.productId] = { purchases: 0, users: [] };\n    }\n    stats[t.productId].purchases += 1;\n    if (!stats[t.productId].users.includes(t.userId)) {\n      stats[t.productId].users.push(t.userId);\n    }\n  }\n  return Object.entries(stats)\n    .map(([productId, s]) => ({ productId, purchases: s.purchases, uniqueUsers: s.users.length }))\n    .sort((a, b) => b.purchases - a.purchases || a.productId.localeCompare(b.productId))\n    .slice(0, Math.max(0, topN));\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "map", label: "map で最終的な { productId, purchases, uniqueUsers } の形に変換する" },
        { kind: "method", name: "includes", label: "includes でユーザーがすでに登場済みかを判定する" },
        { kind: "method", name: "sort", label: "sort で並べ替える" },
        { kind: "method", name: "slice", label: "slice で上位 N 件を切り出す" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果配列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function popularProductsRanking(transactions, topN) {
  const stats = {};
  for (const t of transactions) {
    if (!stats[t.productId]) {
      stats[t.productId] = { purchases: 0, users: [] };
    }
    stats[t.productId].purchases += 1;
    if (!stats[t.productId].users.includes(t.userId)) {
      stats[t.productId].users.push(t.userId);
    }
  }
  return Object.entries(stats)
    .map(([productId, s]) => ({ productId, purchases: s.purchases, uniqueUsers: s.users.length }))
    .sort((a, b) => b.purchases - a.purchases || a.productId.localeCompare(b.productId))
    .slice(0, Math.max(0, topN));
}
`,
  badSolutions: [
    {
      code: `function popularProductsRanking(transactions, topN) {
  const stats = {};
  for (const t of transactions) {
    if (!stats[t.productId]) {
      stats[t.productId] = { purchases: 0, users: [] };
    }
    stats[t.productId].purchases += 1;
    stats[t.productId].users.push(t.userId);
  }
  return Object.entries(stats)
    .map(([productId, s]) => ({ productId, purchases: s.purchases, uniqueUsers: s.users.length }))
    .sort((a, b) => b.purchases - a.purchases || a.productId.localeCompare(b.productId))
    .slice(0, Math.max(0, topN));
}
`,
      description: "includes でユニーク判定せず無条件に push しているため、 uniqueUsers が延べ件数と同じになる (AST required 違反 + テスト失敗)",
    },
    {
      code: `function popularProductsRanking(transactions, topN) {
  const stats = {};
  for (const t of transactions) {
    if (!stats[t.productId]) {
      stats[t.productId] = { purchases: 0, users: [] };
    }
    stats[t.productId].purchases += 1;
    if (!stats[t.productId].users.includes(t.userId)) {
      stats[t.productId].users.push(t.userId);
    }
  }
  return Object.entries(stats)
    .map(([productId, s]) => ({ productId, purchases: s.purchases, uniqueUsers: s.users.length }))
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, Math.max(0, topN));
}
`,
      description: "productId 昇順のタイブレークが無く、 purchases が同数のときに期待順にならない (テスト失敗)",
    },
    {
      code: `function popularProductsRanking(transactions, topN) {
  const stats = {};
  for (const t of transactions) {
    if (!stats[t.productId]) {
      stats[t.productId] = { purchases: 0, users: [] };
    }
    stats[t.productId].purchases += 1;
    if (!stats[t.productId].users.includes(t.userId)) {
      stats[t.productId].users.push(t.userId);
    }
  }
  return Object.entries(stats)
    .map(([productId, s]) => ({ productId, purchases: s.purchases, uniqueUsers: s.users.length }))
    .sort((a, b) => b.purchases - a.purchases || a.productId.localeCompare(b.productId));
}
`,
      description: "slice で上位 N 件に切り出していない (AST required 違反 + topN テスト失敗)",
    },
    {
      code: `function popularProductsRanking(transactions, topN) {
  const counts = {};
  for (const t of transactions) {
    counts[t.productId] = (counts[t.productId] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([productId, purchases]) => ({ productId, purchases, uniqueUsers: purchases }))
    .sort((a, b) => b.purchases - a.purchases || a.productId.localeCompare(b.productId))
    .slice(0, Math.max(0, topN));
}
`,
      description: "uniqueUsers を purchases と同じ値にしてしまっており、 同一ユーザー複数購入のテストで失敗する (AST required 違反 + テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.includes()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/includes",
      pageTitle: "Array.prototype.includes()",
    },
    {
      heading: "Array.prototype.sort()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
      pageTitle: "Array.prototype.sort()",
    },
    {
      heading: "Array.prototype.slice()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/slice",
      pageTitle: "Array.prototype.slice()",
    },
    {
      heading: "Object.entries()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/entries",
      pageTitle: "Object.entries()",
    },
  ],
};
