import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch08UpdateCartItem: Assignment = {
  id: "S5-Ch08-02-update-cart-item",
  stage: "S5",
  chapterId: "Ch08",
  sequence: 2,
  title: "ショッピングカートの数量を 非破壊で更新する (構造共有つき)",
  newConcept:
    "ネストしたデータ ({ items: [{ id, qty, ... }] }) の一部だけを非破壊で更新する典型パターン。 影響を受けるアイテムだけ新オブジェクトに置き換え、 それ以外は元の参照をそのまま再利用 (構造共有) する設計判断を学ぶ",
  estimatedMinutes: 55,
  difficulty: 2,
  testKind: "function",
  description: `## やること

ショッピングカート \`cart\` と、 更新したい商品 \`id\`、 数量の増減 \`delta\` を受け取り、 **元の cart を一切書き換えず** 新しい cart を返す関数 \`updateCartItem(cart, id, delta)\` を実装してください。

### 入力の形

\`\`\`js
const cart = {
  customerId: "u01",
  items: [
    { id: 1, name: "Apple",  qty: 2 },
    { id: 2, name: "Banana", qty: 5 },
    { id: 3, name: "Cherry", qty: 1 },
  ],
};
\`\`\`

### 振る舞い

- 指定 \`id\` のアイテムの \`qty\` を \`delta\` だけ増減する (\`delta\` は負の数もありうる)。
- 更新後の \`qty\` が **0 以下になったらそのアイテムを除外** する (買い物カゴから消える)。
- 指定 \`id\` がカートに無いときは、 \`items\` の中身は元と同じ。 ただし戻り値は **元の cart とは別インスタンス** にする (引数を返さない)。
- 戻り値は \`{ ...cart, items: 新しい items 配列 }\`。 \`customerId\` などの他のフィールドも引き継ぐ。

\`\`\`js
updateCartItem(cart, 2, -3);
// → {
//   customerId: "u01",
//   items: [
//     { id: 1, name: "Apple",  qty: 2 },   // 元と同じ参照
//     { id: 2, name: "Banana", qty: 2 },   // 5 - 3 = 2 (新オブジェクト)
//     { id: 3, name: "Cherry", qty: 1 },   // 元と同じ参照
//   ],
// }

updateCartItem(cart, 3, -1);
// → 3 番の qty が 0 になるので items から消える
//   items: [{ id: 1, ... }, { id: 2, ... }]

updateCartItem(cart, 999, 1);
// → 該当無し。 items の中身は元と同じだが、 cart も items 配列も別インスタンス。
\`\`\`

### 守るべき制約

- 元の \`cart\` オブジェクトを書き換えない (\`cart.items\` も書き換えない)。
- 元の **影響を受けないアイテム** (id が違うアイテム) は **同じ参照のまま** 新しい items 配列に入れる (構造共有)。 これにより 「変わったところだけ識別できる」 React 等の差分検知に強い設計になる。
- \`map\` / \`filter\` / \`reduce\` は使わない (Ch09 で導入予定)。 \`splice\` / \`sort\` / \`reverse\` は配列を破壊するため禁止。

## ポイント

- これは S5 (設計演習) で、 「**イミュータブル更新 vs ミューテーション**」 の設計判断を体で覚える問題です。
- 推奨フロー:
  1. 結果用の \`const newItems = []\` を用意する。
  2. \`for...of\` で元の \`cart.items\` を 1 周。
  3. \`item.id !== id\` の場合は **\`item\` をそのまま** \`newItems.push(item)\` (構造共有)。
  4. \`item.id === id\` の場合は \`newQty = item.qty + delta\` を計算し、 \`newQty > 0\` なら \`{ ...item, qty: newQty }\` を push。 \`newQty <= 0\` なら **何も push しない** (除外)。
  5. 最後に \`return { ...cart, items: newItems }\`。
- カート全体も items 配列も **常に新しいインスタンスを返す** こと。 該当 id が無い場合に \`return cart\` してしまうと、 「該当無しでも別インスタンス」 のテストが落ちます。 Redux/React の reducer に倣えば 「未変更なら元の参照を返す」 のが一般的ですが、 この課題では返却規約を単純化するため あえて 「常に新インスタンス」 に統一しています。
- 影響を受けないアイテムは新オブジェクトを作らない (\`{ ...item }\` を全件にかけない)。 全件コピーすると、 React 等で 「全部変わった」 と誤検知して再レンダリングが多発します。
`,
  starterFiles: singleFile(`function updateCartItem(cart, id, delta) {
  // 1) 結果用の空の配列を用意する。
  //
  // 2) for...of で cart.items を 1 件ずつ見る。
  //    - item.id !== id のとき: 何もせず item を そのまま push する (構造共有)。
  //    - item.id === id のとき:
  //        新しい数量 newQty = item.qty + delta を計算し、
  //        newQty > 0 なら { ...item, qty: newQty } を push する。
  //        newQty <= 0 なら 何も push しない (除外)。
  //
  // 3) 最後に { ...cart, items: 上で作った配列 } を return する。
}
`),
  entryPoints: ["updateCartItem"],
  demoCall: `console.log(updateCartItem({ customerId: "u01", items: [{ id: 1, name: "Apple", qty: 2 }] }, 1, 3));`,
  tests: [
    {
      name: "数量を増やせる (delta が正)",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, name: "A", qty: 2 }] };
        const r = updateCartItem(cart, 1, 3);
        return r.items[0].qty === 5 && r.items[0].id === 1 && r.items[0].name === "A";
      })()`,
    },
    {
      name: "数量を減らせる (delta が負、 0 より大)",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 5 }] };
        const r = updateCartItem(cart, 1, -3);
        return r.items.length === 1 && r.items[0].qty === 2;
      })()`,
    },
    {
      name: "数量が 0 になったら items から除外する",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 1 }, { id: 2, qty: 5 }] };
        const r = updateCartItem(cart, 1, -1);
        return r.items.length === 1 && r.items[0].id === 2;
      })()`,
    },
    {
      name: "数量が マイナス になったら items から除外する",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 2 }, { id: 2, qty: 5 }] };
        const r = updateCartItem(cart, 1, -10);
        return r.items.length === 1 && r.items[0].id === 2;
      })()`,
    },
    {
      name: "他のアイテムには影響しない & 順序を保つ",
      code: `(() => {
        const cart = { customerId: "u01", items: [
          { id: 1, qty: 1 },
          { id: 2, qty: 2 },
          { id: 3, qty: 3 },
        ] };
        const r = updateCartItem(cart, 2, 10);
        return r.items[0].id === 1 && r.items[0].qty === 1
          && r.items[1].id === 2 && r.items[1].qty === 12
          && r.items[2].id === 3 && r.items[2].qty === 3;
      })()`,
    },
    {
      name: "customerId など他のフィールドはスプレッドで引き継がれる",
      code: `(() => {
        const cart = { customerId: "u01", coupon: "X1", items: [{ id: 1, qty: 1 }] };
        const r = updateCartItem(cart, 1, 1);
        return r.customerId === "u01" && r.coupon === "X1";
      })()`,
    },
    {
      name: "戻り値の cart は 元の cart と 別インスタンス",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 1 }] };
        const r = updateCartItem(cart, 1, 1);
        return r !== cart;
      })()`,
    },
    {
      name: "戻り値の items 配列も 元の items 配列と 別インスタンス",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 1 }] };
        const r = updateCartItem(cart, 1, 1);
        return r.items !== cart.items;
      })()`,
    },
    {
      name: "該当 id が無くても 新しい cart / 新しい items 配列を返す (元と同じ内容でも別インスタンス)",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 1 }, { id: 2, qty: 2 }] };
        const r = updateCartItem(cart, 999, 5);
        return r !== cart
          && r.items !== cart.items
          && r.items.length === 2
          && r.items[0].id === 1 && r.items[0].qty === 1
          && r.items[1].id === 2 && r.items[1].qty === 2;
      })()`,
    },
    {
      name: "元の cart を 破壊しない",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 1 }, { id: 2, qty: 2 }] };
        const before = JSON.stringify(cart);
        updateCartItem(cart, 1, 10);
        return JSON.stringify(cart) === before;
      })()`,
    },
    {
      name: "元の items 配列の length を 変えない",
      code: `(() => {
        const cart = { customerId: "u01", items: [{ id: 1, qty: 1 }, { id: 2, qty: 2 }] };
        updateCartItem(cart, 1, -1);
        return cart.items.length === 2;
      })()`,
    },
    {
      name: "影響を受けないアイテムは 元の参照のまま (構造共有)",
      code: `(() => {
        const apple = { id: 1, qty: 1 };
        const banana = { id: 2, qty: 2 };
        const cart = { customerId: "u01", items: [apple, banana] };
        const r = updateCartItem(cart, 1, 5);
        return r.items[1] === banana && r.items[0] !== apple;
      })()`,
    },
    {
      name: "更新された item は 元の item とは 別オブジェクト",
      code: `(() => {
        const apple = { id: 1, name: "Apple", qty: 1 };
        const cart = { customerId: "u01", items: [apple] };
        const r = updateCartItem(cart, 1, 5);
        return r.items[0] !== apple && r.items[0].name === "Apple" && r.items[0].qty === 6;
      })()`,
    },
    {
      name: "空 items でも 新しい cart が返る",
      code: `(() => {
        const cart = { customerId: "u01", items: [] };
        const r = updateCartItem(cart, 1, 5);
        return r !== cart && Array.isArray(r.items) && r.items.length === 0 && r.customerId === "u01";
      })()`,
    },
  ],
  hints: [
    "スプレッドは 「コピーする深さ」 が大事。 ここでは cart 全体 ({ ...cart, items: 新配列 }) と、 影響を受けた 1 件の item ({ ...item, qty: ... }) の 2 箇所だけスプレッドします。 影響を受けない他の item は元の参照をそのまま使えば 構造共有 になります。",
    "for...of で items を 1 周し、 if (item.id !== id) ならそのまま push、 else は新数量を計算して 0 より大きいときだけ { ...item, qty: newQty } を push。 0 以下なら push しない (= 除外)。",
    "解答例:\n```js\nfunction updateCartItem(cart, id, delta) {\n  const newItems = [];\n  for (const item of cart.items) {\n    if (item.id !== id) {\n      newItems.push(item);\n    } else {\n      const newQty = item.qty + delta;\n      if (newQty > 0) {\n        newItems.push({ ...item, qty: newQty });\n      }\n    }\n  }\n  return { ...cart, items: newItems };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function updateCartItem(cart, id, delta) { ... } の宣言形式" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で新しい cart を返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of で items を走査する" },
        { kind: "node", nodeType: "SpreadElement", label: "{ ...cart, items: ... } / { ...item, qty: ... } で非破壊に新オブジェクトを作る" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "map", label: "S5-Ch08 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S5-Ch08 では filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "reduce", label: "S5-Ch08 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "splice", label: "splice は元配列を破壊するので使わない" },
        { kind: "method", name: "sort", label: "sort は元配列を破壊するので使わない" },
        { kind: "method", name: "reverse", label: "reverse は元配列を破壊するので使わない" },
      ],
    },
  },
  solution: `function updateCartItem(cart, id, delta) {
  const newItems = [];
  for (const item of cart.items) {
    if (item.id !== id) {
      newItems.push(item);
    } else {
      const newQty = item.qty + delta;
      if (newQty > 0) {
        newItems.push({ ...item, qty: newQty });
      }
    }
  }
  return { ...cart, items: newItems };
}
`,
  badSolutions: [
    {
      code: `function updateCartItem(cart, id, delta) {
  for (const item of cart.items) {
    if (item.id === id) {
      item.qty += delta;
    }
  }
  return cart;
}
`,
      description: "元の item / cart を直接ミューテーションしている (非破壊テスト失敗、 スプレッドも使っていないので AST required: SpreadElement 違反)",
    },
    {
      code: `function updateCartItem(cart, id, delta) {
  return {
    ...cart,
    items: cart.items.filter((item) => !(item.id === id && item.qty + delta <= 0))
                     .map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item),
  };
}
`,
      description: "filter / map を使っている (AST forbidden 違反)",
    },
    {
      code: `function updateCartItem(cart, id, delta) {
  const newItems = [];
  for (const item of cart.items) {
    if (item.id !== id) {
      newItems.push({ ...item });
    } else {
      const newQty = item.qty + delta;
      if (newQty > 0) {
        newItems.push({ ...item, qty: newQty });
      }
    }
  }
  return { ...cart, items: newItems };
}
`,
      description: "影響を受けないアイテムまで { ...item } で 新オブジェクトに作り変えている。 「構造共有」 テスト (r.items[1] === banana) が失敗する",
    },
    {
      code: `function updateCartItem(cart, id, delta) {
  let found = false;
  for (const item of cart.items) {
    if (item.id === id) {
      found = true;
    }
  }
  if (!found) {
    return cart;
  }
  const newItems = [];
  for (const item of cart.items) {
    if (item.id !== id) {
      newItems.push(item);
    } else {
      const newQty = item.qty + delta;
      if (newQty > 0) {
        newItems.push({ ...item, qty: newQty });
      }
    }
  }
  return { ...cart, items: newItems };
}
`,
      description: "該当 id が無いときに return cart で 元のインスタンスを そのまま 返している。 「該当無しでも別インスタンス」 テスト (r !== cart) が失敗する",
    },
    {
      code: `function updateCartItem(cart, id, delta) {
  const newItems = [];
  for (const item of cart.items) {
    if (item.id !== id) {
      newItems.push(item);
    } else {
      newItems.push({ ...item, qty: item.qty + delta });
    }
  }
  return { ...cart, items: newItems };
}
`,
      description: "数量が 0 以下になっても 除外せず 0 や マイナスの qty で残してしまう (「0 になったら除外」 テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "スプレッド構文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      pageTitle: "スプレッド構文",
    },
    {
      heading: "Array.prototype.push",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/push",
      pageTitle: "Array.prototype.push",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
