import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch06TopSpenderPerCategoryCapstone: Assignment = {
  id: "S5-Ch06-03-top-spender-per-category-capstone",
  stage: "S5",
  chapterId: "Ch06",
  sequence: 3,
  title: "[卒業課題] 購入ログから カテゴリ別の最高消費ユーザーを Map で集計する",
  newConcept:
    "「集計のための 1 周」 と 「集計結果から答えを取り出す 1 周」 に多重ループを分割し、 Map<カテゴリ, Map<userId, 累計>> という入れ子データ構造を組み立てる、 設計の集大成",
  estimatedMinutes: 80,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

購入ログの配列 \`logs\` (各要素は \`{ userId, category, amount }\` の形) を受け取り、 **カテゴリごとに最も多く消費したユーザー** を求める関数 \`topSpenderPerCategory\` を実装してください。

戻り値は \`Map<string, { userId: string; total: number }>\` — キーがカテゴリ名、 値がそのカテゴリのトップユーザーと合計金額です。

- カテゴリ内で **同じユーザーの複数ログは合算** して扱う
- 合計が同点なら **\`userId\` の昇順 (文字列の辞書順) で先のもの** を採用する
- 入力が空のときは **空の Map** (\`new Map()\`) を返す
- \`amount\` は 0 以上の整数 (テストでは整数のみ与えます)

\`\`\`js
const result = topSpenderPerCategory([
  { userId: "u1", category: "food", amount: 100 },
  { userId: "u2", category: "food", amount: 80 },
  { userId: "u1", category: "food", amount: 50 },   // u1 の food は合計 150
  { userId: "u2", category: "book", amount: 200 },
]);

result.get("food"); // → { userId: "u1", total: 150 }
result.get("book"); // → { userId: "u2", total: 200 }
result.size;        // → 2
\`\`\`

## ポイント

- これは **S5 卒業課題** です。 「ループを 2 つに分割する設計」 「Map of Map による入れ子集計」 「タイブレーク付きの最大値選び」 という、 Ch06 (ループ) で身につけたいパターンを 1 問にまとめた統合演習。
- 推奨フロー (ループを 2 段に分ける):
  1. **1 周目**: 集計用の \`totals = new Map()\` を作る (型は \`Map<category, Map<userId, total>>\`)。 \`for...of\` で 1 件ずつログを処理し、 該当 category の Map に \`userId → 累計金額\` を加算していく。 「未登場の category なら新規 Map を作る」 「未登場の userId なら 0 から始める」 の 2 段の初期化が必要
  2. **2 周目**: 結果用の \`result = new Map()\` を用意し、 \`totals\` の各 category について **その内側の Map を for...of で 1 周** して 「合計が最大、 同点なら userId 昇順」 のユーザーを 1 つ選び、 \`result.set(category, { userId, total })\` する
- **答えは ループ + 比較で出す**。 \`.sort\` を使って並べ替えてから 1 番目を取る、 のような書き方は AST で禁止しています (Ch09 を先取りしないため)
- タイブレークの判定は \`total > best.total || (total === best.total && userId < best.userId)\` の 1 行で書けるのが定番。 ただし 最初のループ前の \`best\` が無い (= まだ何も見ていない) 場合の判定を忘れないこと
- AST で **\`new Map()\`**、 **\`for...of\`** (複数)、 **\`.set\` / \`.get\` / \`.has\`**、 **\`if\`**、 **\`return\`** をすべて必須にしています
`,
  starterFiles: singleFile(`function topSpenderPerCategory(logs) {
  // 1 周目: category -> (userId -> 合計金額) という入れ子の Map を組み立てる
  // ヒント: const totals = new Map();
  //        - 未登場 category なら totals.set(category, new Map())
  //        - 未登場 userId なら 0 から始め、 amount を加算


  // 2 周目: 各 category について 内側の Map を for...of で走査し、
  // 「合計が最大、 同点なら userId 昇順」 のユーザーを 1 つ選ぶ
  // ヒント: const result = new Map();
  //        for (const [category, userTotals] of totals) { ... }
  //        for (const [userId, total] of userTotals) { ... }


  // 結果の Map を返す
}
`),
  entryPoints: ["topSpenderPerCategory"],
  demoCall: `(() => {
  const r = topSpenderPerCategory([
    { userId: "u1", category: "food", amount: 100 },
    { userId: "u2", category: "food", amount: 80 },
    { userId: "u1", category: "food", amount: 50 },
    { userId: "u2", category: "book", amount: 200 },
  ]);
  console.log("food =", r.get("food"));
  console.log("book =", r.get("book"));
})();`,
  tests: [
    {
      name: "基本ケース: food は u1 (合算 150)、 book は u2 (200)",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "food", amount: 100 }, { userId: "u2", category: "food", amount: 80 }, { userId: "u1", category: "food", amount: 50 }, { userId: "u2", category: "book", amount: 200 }]); return r.get("food").userId === "u1" && r.get("food").total === 150 && r.get("book").userId === "u2" && r.get("book").total === 200; })()`,
    },
    {
      name: "戻り値は Map インスタンス",
      code: `topSpenderPerCategory([{ userId: "u1", category: "x", amount: 1 }]) instanceof Map`,
    },
    {
      name: "空配列で空の Map を返す",
      code: `(() => { const r = topSpenderPerCategory([]); return r instanceof Map && r.size === 0; })()`,
    },
    {
      name: "1 件だけのログでも正しく処理する",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "x", amount: 42 }]); return r.size === 1 && r.get("x").userId === "u1" && r.get("x").total === 42; })()`,
    },
    {
      name: "同じユーザーの同 category は合算される",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "x", amount: 10 }, { userId: "u1", category: "x", amount: 20 }, { userId: "u1", category: "x", amount: 30 }]); return r.get("x").userId === "u1" && r.get("x").total === 60; })()`,
    },
    {
      name: "合計が同点なら userId 昇順 (u2 と u1 ならば u1 が勝つ)",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u2", category: "x", amount: 100 }, { userId: "u1", category: "x", amount: 100 }]); return r.get("x").userId === "u1" && r.get("x").total === 100; })()`,
    },
    {
      name: "タイブレーク: 入力順が逆 (u1 が先) でも u1 が選ばれる",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "x", amount: 50 }, { userId: "u2", category: "x", amount: 50 }]); return r.get("x").userId === "u1"; })()`,
    },
    {
      name: "category が複数あり、 それぞれ独立に最大が選ばれる",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "a", amount: 10 }, { userId: "u2", category: "a", amount: 5 }, { userId: "u1", category: "b", amount: 5 }, { userId: "u2", category: "b", amount: 10 }]); return r.get("a").userId === "u1" && r.get("b").userId === "u2"; })()`,
    },
    {
      name: "amount = 0 のログがあっても累計は変わらない",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "x", amount: 0 }, { userId: "u1", category: "x", amount: 5 }]); return r.get("x").userId === "u1" && r.get("x").total === 5; })()`,
    },
    {
      name: "全員 amount = 0 でもユーザーは選ばれる (タイブレーク = userId 昇順)",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u2", category: "x", amount: 0 }, { userId: "u1", category: "x", amount: 0 }]); return r.get("x").userId === "u1" && r.get("x").total === 0; })()`,
    },
    {
      name: "size がカテゴリ数と一致する (4 categories)",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "a", amount: 1 }, { userId: "u1", category: "b", amount: 1 }, { userId: "u1", category: "c", amount: 1 }, { userId: "u1", category: "d", amount: 1 }]); return r.size === 4; })()`,
    },
    {
      name: "未登場の category を get すると undefined",
      code: `topSpenderPerCategory([{ userId: "u1", category: "a", amount: 1 }]).get("zzz") === undefined`,
    },
    {
      name: "総合: 3 ユーザー × 2 カテゴリの混在ログから期待通りの集計が出る (food は同点 u2/u3 で u2 が勝ち、 book は u1)",
      code: `(() => { const r = topSpenderPerCategory([{ userId: "u1", category: "food", amount: 30 }, { userId: "u2", category: "food", amount: 50 }, { userId: "u3", category: "food", amount: 50 }, { userId: "u1", category: "food", amount: 15 }, { userId: "u3", category: "book", amount: 200 }, { userId: "u1", category: "book", amount: 300 }, { userId: "u2", category: "book", amount: 100 }]); return r.size === 2 && r.get("food").userId === "u2" && r.get("food").total === 50 && r.get("book").userId === "u1" && r.get("book").total === 300; })()`,
    },
  ],
  hints: [
    "「ループを 1 周にまとめよう」 とすると、 「集計しながら同時に最大も取る」 という管理が複雑になります。 まずは **集計用の Map** だけ for で組み立て、 その後 **別の for で結果用の Map を作る** 2 段に分けるのが S5 の設計の王道です。",
    "Map は for...of で [key, value] のペアを取り出せます。 const totals = new Map(); for (const [category, userTotals] of totals) { for (const [userId, total] of userTotals) { ... } } のように **二重に for...of** を回せばカテゴリ × ユーザーの全組合せを走査できます。",
    "タイブレーク (合計が同点) の判定は best === null も含めて || で並べると 1 行になります: if (best === null || total > best.total || (total === best.total && userId < best.userId)) { best = { userId, total }; } — 最初の null チェックを忘れると最初の比較で落ちる点に注意。",
    "解答例:\n```js\nfunction topSpenderPerCategory(logs) {\n  const totals = new Map();\n  for (const log of logs) {\n    if (!totals.has(log.category)) {\n      totals.set(log.category, new Map());\n    }\n    const userTotals = totals.get(log.category);\n    const prev = userTotals.has(log.userId) ? userTotals.get(log.userId) : 0;\n    userTotals.set(log.userId, prev + log.amount);\n  }\n\n  const result = new Map();\n  for (const [category, userTotals] of totals) {\n    let best = null;\n    for (const [userId, total] of userTotals) {\n      if (best === null || total > best.total || (total === best.total && userId < best.userId)) {\n        best = { userId, total };\n      }\n    }\n    result.set(category, best);\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "NewExpression", label: "new Map() でデータ構造を用意する" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of で 1 周ずつ走査する (集計用と結果用の 2 段)" },
        { kind: "method", name: "set", label: "Map.set で 「カテゴリ → 内側 Map」 や 「userId → 累計」 を記録する" },
        { kind: "method", name: "get", label: "Map.get で内側の Map や累計を取り出す" },
        { kind: "method", name: "has", label: "Map.has で未登場のキーかを判定する" },
        { kind: "node", nodeType: "IfStatement", label: "if で 「未登場の初期化」 や 「最大値の更新」 を判定する" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果の Map を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "map", label: "S5-Ch06 では .map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S5-Ch06 では .filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "reduce", label: "S5-Ch06 では .reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "sort", label: "S5-Ch06 では .sort を使わない (ループ + 比較で最大を選ぶ)" },
        { kind: "method", name: "indexOf", label: "indexOf による線形探索を使わない (計算量が増大するため)" },
      ],
    },
  },
  solution: `function topSpenderPerCategory(logs) {
  const totals = new Map();
  for (const log of logs) {
    if (!totals.has(log.category)) {
      totals.set(log.category, new Map());
    }
    const userTotals = totals.get(log.category);
    const prev = userTotals.has(log.userId) ? userTotals.get(log.userId) : 0;
    userTotals.set(log.userId, prev + log.amount);
  }

  const result = new Map();
  for (const [category, userTotals] of totals) {
    let best = null;
    for (const [userId, total] of userTotals) {
      if (best === null || total > best.total || (total === best.total && userId < best.userId)) {
        best = { userId, total };
      }
    }
    result.set(category, best);
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function topSpenderPerCategory(logs) {
  const totals = new Map();
  for (const log of logs) {
    if (!totals.has(log.category)) {
      totals.set(log.category, new Map());
    }
    const userTotals = totals.get(log.category);
    userTotals.set(log.userId, log.amount);
  }

  const result = new Map();
  for (const [category, userTotals] of totals) {
    let best = null;
    for (const [userId, total] of userTotals) {
      if (best === null || total > best.total || (total === best.total && userId < best.userId)) {
        best = { userId, total };
      }
    }
    result.set(category, best);
  }
  return result;
}
`,
      description: "同じ userId の複数ログを合算せず、 最後の amount で上書きしているため、 合算が必要なテストで失敗する",
    },
    {
      code: `function topSpenderPerCategory(logs) {
  const totals = new Map();
  for (const log of logs) {
    if (!totals.has(log.category)) {
      totals.set(log.category, new Map());
    }
    const userTotals = totals.get(log.category);
    const prev = userTotals.has(log.userId) ? userTotals.get(log.userId) : 0;
    userTotals.set(log.userId, prev + log.amount);
  }

  const result = new Map();
  for (const [category, userTotals] of totals) {
    let best = null;
    for (const [userId, total] of userTotals) {
      if (best === null || total > best.total) {
        best = { userId, total };
      }
    }
    result.set(category, best);
  }
  return result;
}
`,
      description: "同点タイブレーク (userId 昇順) を実装していないため、 合計が同点で u2 が先に登場すると u2 を返してしまう (テスト失敗)",
    },
    {
      code: `function topSpenderPerCategory(logs) {
  const totals = new Map();
  for (const log of logs) {
    if (!totals.has(log.category)) {
      totals.set(log.category, new Map());
    }
    const userTotals = totals.get(log.category);
    const prev = userTotals.has(log.userId) ? userTotals.get(log.userId) : 0;
    userTotals.set(log.userId, prev + log.amount);
  }

  const result = new Map();
  for (const [category, userTotals] of totals) {
    let best = { userId: "", total: 0 };
    for (const [userId, total] of userTotals) {
      if (total > best.total || (total === best.total && userId < best.userId)) {
        best = { userId, total };
      }
    }
    result.set(category, best);
  }
  return result;
}
`,
      description: "best の初期値を { userId: '', total: 0 } にしているため、 全員 amount = 0 のとき空文字 '' のままになって失敗する (テスト失敗)",
    },
    {
      code: `function topSpenderPerCategory(logs) {
  const result = new Map();
  for (let i = 0; i < logs.length; i++) {
    let best = null;
    for (let j = 0; j < logs.length; j++) {
      if (logs[j].category === logs[i].category) {
        if (best === null || logs[j].amount > best.total) {
          best = { userId: logs[j].userId, total: logs[j].amount };
        }
      }
    }
    result.set(logs[i].category, best);
  }
  return result;
}
`,
      description: "ログを category ごとに合算せず、 単発の amount で最大を取っているため、 同じユーザー複数ログ・タイブレークいずれのテストも通らない (AST required 違反: for...of / Map.has 等を使っていない)",
    },
  ],
  mdnSections: [
    {
      heading: "Map",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map",
      pageTitle: "Map",
    },
    {
      heading: "Map.prototype.set()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map/set",
      pageTitle: "Map.prototype.set()",
    },
    {
      heading: "Map.prototype.get()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map/get",
      pageTitle: "Map.prototype.get()",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
