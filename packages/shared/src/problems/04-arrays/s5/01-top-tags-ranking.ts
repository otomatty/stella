import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch04TopTagsRanking: Assignment = {
  id: "S5-Ch04-01-top-tags-ranking",
  stage: "S5",
  chapterId: "Ch04",
  sequence: 1,
  title: "タグの出現回数を集計して上位 N 件のランキングを返す",
  newConcept:
    "オブジェクトで集計 → Object.entries で配列化 → sort + slice で並べ替え・切り出し、 という配列パイプラインを 1 本に組み立てる",
  estimatedMinutes: 50,
  difficulty: 2,
  testKind: "function",
  description: `## やること

タグ (文字列) の配列 \`tags\` と上限件数 \`topN\` を受け取り、 **出現回数が多い順** に上位 \`topN\` 件を \`{ tag, count }\` オブジェクトの配列にして返す関数 \`topTagsRanking\` を実装してください。

- \`count\` の降順で並べる
- \`count\` が同じ場合は **\`tag\` の昇順 (文字列の辞書順)** で並べる
- \`topN\` が 0 以下のときは \`[]\` を返す
- 入力 \`tags\` が空のときは \`[]\` を返す
- \`topN\` が登場するタグ種類数より多い場合は、 **存在する全タグを並べて返す** (件数は足りない分だけ少なくて良い)

\`\`\`js
topTagsRanking(["js", "ts", "js", "py", "js", "ts"], 2);
// → [
//     { tag: "js", count: 3 },
//     { tag: "ts", count: 2 },
//   ]

topTagsRanking(["b", "a", "b", "a", "c"], 2);
// → [
//     { tag: "a", count: 2 },   // 同数なので tag 昇順
//     { tag: "b", count: 2 },
//   ]

topTagsRanking([], 5);            // → []
topTagsRanking(["x", "x"], 0);    // → []
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 paiza B/A 風に **「配列のパイプライン (集計 → 並べ替え → 検索) を 1 本にまとめる」** モデルを練習します。
- 推奨フロー:
  1. 集計用オブジェクト \`counts\` に対し、 \`for...of\` で \`counts[tag] = (counts[tag] ?? 0) + 1\` で加算 (S4 のオブジェクトカウンタ)
  2. \`Object.entries(counts)\` で \`[tag, count]\` の配列にし、 \`.map(([tag, count]) => ({ tag, count }))\` でオブジェクト配列に整える
  3. \`.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))\` で **count 降順 + tag 昇順** の 2 段ソート
  4. \`.slice(0, topN)\` で上位 N 件を切り出す
- S4 までと違って、 S5 では **\`map\` / \`filter\` / \`sort\` / \`slice\`** などの配列メソッドを **積極的に使う** ことが目的です (チェーンで読みやすく書く設計演習)。
- AST で **\`map\` の使用** と **\`sort\` の使用** と **\`slice\` の使用** を必須にしています。
`,
  starterFiles: singleFile(`function topTagsRanking(tags, topN) {
  // for...of で tags を 1 周し、 タグごとの出現回数を集計用オブジェクトに貯める


  // 集計オブジェクトを Object.entries で配列化し、 map で説明文の出力要素形に整える


  // sort で件数の降順 + タグの昇順 (localeCompare) の 2 段ソートに並べ替える


  // slice で上位 topN 件に切り出して return する
}
`),
  entryPoints: ["topTagsRanking"],
  demoCall: `console.log(topTagsRanking(["js", "ts", "js", "py", "js", "ts"], 2));`,
  tests: [
    {
      name: "出現回数の降順で上位 2 件を抽出できる",
      code: `JSON.stringify(topTagsRanking(["js", "ts", "js", "py", "js", "ts"], 2)) === JSON.stringify([{ tag: "js", count: 3 }, { tag: "ts", count: 2 }])`,
    },
    {
      name: "同数のときは tag 昇順で並ぶ",
      code: `JSON.stringify(topTagsRanking(["b", "a", "b", "a", "c"], 2)) === JSON.stringify([{ tag: "a", count: 2 }, { tag: "b", count: 2 }])`,
    },
    {
      name: "空配列を渡すと空配列を返す",
      code: `JSON.stringify(topTagsRanking([], 5)) === JSON.stringify([])`,
    },
    {
      name: "topN が 0 のときは空配列",
      code: `JSON.stringify(topTagsRanking(["x", "x"], 0)) === JSON.stringify([])`,
    },
    {
      name: "topN が負の値でも空配列",
      code: `JSON.stringify(topTagsRanking(["x", "y"], -1)) === JSON.stringify([])`,
    },
    {
      name: "topN が登場タグ数より多くてもエラーにならず全件返す",
      code: `topTagsRanking(["a", "b"], 5).length === 2`,
    },
    {
      name: "単一タグが繰り返された入力でも 1 件にまとまる",
      code: `JSON.stringify(topTagsRanking(["x", "x", "x"], 3)) === JSON.stringify([{ tag: "x", count: 3 }])`,
    },
    {
      name: "戻り値は配列",
      code: `Array.isArray(topTagsRanking(["a"], 1))`,
    },
    {
      name: "各要素は { tag, count } の形",
      code: `(() => { const r = topTagsRanking(["a", "b", "a"], 1)[0]; return typeof r.tag === "string" && typeof r.count === "number"; })()`,
    },
    {
      name: "count は出現回数と一致する",
      code: `topTagsRanking(["k", "k", "k", "k"], 1)[0].count === 4`,
    },
    {
      name: "上位 3 件抽出 (count 降順 + tag 昇順)",
      code: `JSON.stringify(topTagsRanking(["a", "a", "b", "b", "c", "d", "d", "d"], 3)) === JSON.stringify([{ tag: "d", count: 3 }, { tag: "a", count: 2 }, { tag: "b", count: 2 }])`,
    },
  ],
  hints: [
    "まず for...of でオブジェクト counts に集計します: counts[tag] = (counts[tag] ?? 0) + 1。 次に Object.entries(counts) で [tag, count] の配列に直してから処理を続けると後がきれいです。",
    "sort のタイブレークは 「b.count - a.count || a.tag.localeCompare(b.tag)」 のように || で 2 段に書けます。 0 (同値) のときに右辺へ落ちる挙動を利用します。",
    "解答例:\n```js\nfunction topTagsRanking(tags, topN) {\n  const counts = {};\n  for (const tag of tags) {\n    counts[tag] = (counts[tag] ?? 0) + 1;\n  }\n  const items = Object.entries(counts).map(([tag, count]) => ({ tag, count }));\n  items.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));\n  return items.slice(0, Math.max(0, topN));\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "map", label: "map で { tag, count } のオブジェクト配列に変換する" },
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
  solution: `function topTagsRanking(tags, topN) {
  const counts = {};
  for (const tag of tags) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  const items = Object.entries(counts).map(([tag, count]) => ({ tag, count }));
  items.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return items.slice(0, Math.max(0, topN));
}
`,
  badSolutions: [
    {
      code: `function topTagsRanking(tags, topN) {
  const counts = {};
  for (const tag of tags) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  const items = Object.entries(counts).map(([tag, count]) => ({ tag, count }));
  items.sort((a, b) => a.count - b.count);
  return items.slice(0, Math.max(0, topN));
}
`,
      description: "count を昇順にソートしているため、 上位 N 件ではなく下位 N 件になる (テスト失敗)",
    },
    {
      code: `function topTagsRanking(tags, topN) {
  const counts = {};
  for (const tag of tags) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  const items = Object.entries(counts).map(([tag, count]) => ({ tag, count }));
  items.sort((a, b) => b.count - a.count);
  return items.slice(0, Math.max(0, topN));
}
`,
      description: "tag 昇順のタイブレークを実装していないので、 count が同じケースで順序が崩れる (テスト失敗)",
    },
    {
      code: `function topTagsRanking(tags, topN) {
  const counts = {};
  for (const tag of tags) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  const items = Object.entries(counts).map(([tag, count]) => ({ tag, count }));
  items.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return items;
}
`,
      description: "slice で上位 N 件に絞っていない (AST required 違反 + テスト失敗)",
    },
    {
      code: `function topTagsRanking(tags, topN) {
  const counts = {};
  for (const tag of tags) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .slice(0, Math.max(0, topN));
}
`,
      description: "sort を呼んでいないため出現順のままになり、 上位 N 件のランキングにならない (AST required 違反 + テスト失敗)",
    },
  ],
  mdnSections: [
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
