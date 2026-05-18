import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch05ShippingFeePriority: Assignment = {
  id: "S5-Ch05-02-shipping-fee-priority",
  stage: "S5",
  chapterId: "Ch05",
  sequence: 2,
  title: "仕様の優先順位を反映して配送料を計算する",
  newConcept:
    "複数の特例 (異常入力 / 会員特典 / 閾値特典 / 通常計算 / 加算) を 「先に判定すべきもの」 から順にガード節で並べ、 早期 return で深いネストを避ける設計",
  estimatedMinutes: 50,
  difficulty: 2,
  testKind: "function",
  description: `## やること

注文情報 \`order\` を受け取り、 **配送料 (円)** を返す関数 \`calculateShippingFee\` を実装してください。 異常な入力に対しては \`-1\` を返します。

### order の形

\`\`\`js
{
  totalAmount: number,    // 注文合計金額 (円、 0 以上)
  weight: number,         // 重量 (kg、 0 以上)
  distance: number,       // 配送距離 (km、 0 以上)
  isPremium: boolean,     // プレミアム会員フラグ
  isFragile: boolean,     // 壊れ物フラグ
}
\`\`\`

### 仕様の優先順位 (上から順に判定する)

1. **入力検証**: \`totalAmount\` / \`weight\` / \`distance\` のいずれかが、 数値でない、 \`NaN\`、 または負の数のときは \`-1\`
2. **プレミアム会員**: \`isPremium === true\` なら \`0\` (どんな注文でも無料、 後続の特例は無視)
3. **送料無料閾値**: \`totalAmount >= 5000\` なら \`0\` (壊れ物加算も無視)
4. **基本料金**: \`500\` 円
5. **距離加算**: \`100 < distance <= 500\` なら \`+200\`、 \`500 < distance\` なら \`+500\`
6. **重量加算**: \`5 < weight <= 10\` なら \`+200\`、 \`10 < weight\` なら \`+400\`
7. **壊れ物加算**: \`isFragile === true\` なら \`+500\`

\`\`\`js
calculateShippingFee({ totalAmount: 3000, weight: 2, distance: 50, isPremium: false, isFragile: false });
// → 500   (基本料金のみ)

calculateShippingFee({ totalAmount: 100, weight: 100, distance: 1000, isPremium: true, isFragile: true });
// → 0     (プレミアムなので壊れ物・遠距離も無視)

calculateShippingFee({ totalAmount: 5000, weight: 2, distance: 50, isPremium: false, isFragile: true });
// → 0     (5000円以上は壊れ物加算も含めて無料)

calculateShippingFee({ totalAmount: 1000, weight: 7, distance: 200, isPremium: false, isFragile: true });
// → 1400  (基本500 + 距離200 + 重量200 + 壊れ物500)

calculateShippingFee({ totalAmount: -100, weight: 2, distance: 50, isPremium: true, isFragile: false });
// → -1    (totalAmount が負。 プレミアムでも入力検証が最優先)
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 **「どの条件を先に判定するか」 が結果を変える** ことを体感し、 仕様の優先順位どおりに guard 節を並べる設計を練習します。
- 推奨フロー:
  1. 一番上に **入力検証ガード**。 違反なら \`return -1\`
  2. 次に **プレミアム会員ガード**。 該当なら \`return 0\`
  3. 次に **送料無料閾値ガード**。 該当なら \`return 0\`
  4. ここまで来た時点で 「通常計算が必要なケース」 に絞り込めている。 基本料金から加算していく
  5. 距離・重量・壊れ物の加算を順に行い、 最後に合計を return
- **早期 return で平坦に書く** のがコツです。 if/else を入れ子にすると S5 の \`max-depth\` 警告 (3 階層まで) や \`no-else-return\` 警告に触れます。
- 仕様順序を逆にすると、 「プレミアムなのに壊れ物加算がかかる」 「負の入力で正の運賃が出てしまう」 などのバグになります。 \`badSolutions\` で具体例を確認してください。
`,
  starterFiles: singleFile(`function calculateShippingFee(order) {
  // 1. 入力検証ガード
  //    totalAmount, weight, distance のいずれかが数値でない、 NaN、 または負の数なら -1 を返す

  // 2. プレミアム会員ガード
  //    isPremium が true ならどんな注文でも 0 を返す

  // 3. 送料無料閾値ガード
  //    totalAmount が 5000 円以上なら 0 を返す (壊れ物加算も含めて無料)

  // 4. ここから通常計算。 基本料金を起点に変数を置く

  // 5. 距離による加算 (100 超〜500 以下なら +200、 500 超なら +500)

  // 6. 重量による加算 (5 超〜10 以下なら +200、 10 超なら +400)

  // 7. 壊れ物フラグが立っているなら +500 する

  // 8. 合計を return する
}
`),
  entryPoints: ["calculateShippingFee"],
  demoCall: `console.log(calculateShippingFee({ totalAmount: 1000, weight: 7, distance: 200, isPremium: false, isFragile: true }));`,
  tests: [
    {
      name: "通常の小型注文は基本料金のみ",
      code: `calculateShippingFee({ totalAmount: 3000, weight: 2, distance: 50, isPremium: false, isFragile: false }) === 500`,
    },
    {
      name: "0 円・0kg・0km も有効入力として基本料金のみ (>= 0 境界)",
      code: `calculateShippingFee({ totalAmount: 0, weight: 0, distance: 0, isPremium: false, isFragile: false }) === 500`,
    },
    {
      name: "0 円注文に壊れ物加算は適用される (非プレミアム)",
      code: `calculateShippingFee({ totalAmount: 0, weight: 0, distance: 0, isPremium: false, isFragile: true }) === 1000`,
    },
    {
      name: "プレミアム会員はどんな注文でも 0",
      code: `calculateShippingFee({ totalAmount: 100, weight: 100, distance: 1000, isPremium: true, isFragile: false }) === 0`,
    },
    {
      name: "プレミアム会員は壊れ物でも 0 (壊れ物加算より優先)",
      code: `calculateShippingFee({ totalAmount: 100, weight: 1, distance: 1, isPremium: true, isFragile: true }) === 0`,
    },
    {
      name: "totalAmount が 5000 ちょうどなら無料 (>= 境界)",
      code: `calculateShippingFee({ totalAmount: 5000, weight: 2, distance: 50, isPremium: false, isFragile: false }) === 0`,
    },
    {
      name: "5000 円以上は壊れ物加算もまとめて無料",
      code: `calculateShippingFee({ totalAmount: 5000, weight: 2, distance: 50, isPremium: false, isFragile: true }) === 0`,
    },
    {
      name: "4999 円ちょうどは無料閾値の手前 (基本料金のみ)",
      code: `calculateShippingFee({ totalAmount: 4999, weight: 2, distance: 50, isPremium: false, isFragile: false }) === 500`,
    },
    {
      name: "距離 200km は +200 (基本500 + 距離200 = 700)",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 1, distance: 200, isPremium: false, isFragile: false }) === 700`,
    },
    {
      name: "距離 600km は +500 (基本500 + 距離500 = 1000)",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 1, distance: 600, isPremium: false, isFragile: false }) === 1000`,
    },
    {
      name: "重量 7kg は +200 (基本500 + 重量200 = 700)",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 7, distance: 50, isPremium: false, isFragile: false }) === 700`,
    },
    {
      name: "重量 12kg は +400 (基本500 + 重量400 = 900)",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 12, distance: 50, isPremium: false, isFragile: false }) === 900`,
    },
    {
      name: "壊れ物は +500 (基本500 + 壊れ物500 = 1000)",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 1, distance: 50, isPremium: false, isFragile: true }) === 1000`,
    },
    {
      name: "距離・重量・壊れ物すべて加算される (基本500 + 200 + 200 + 500 = 1400)",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 7, distance: 200, isPremium: false, isFragile: true }) === 1400`,
    },
    {
      name: "totalAmount が負なら -1 (プレミアムでも検証が最優先)",
      code: `calculateShippingFee({ totalAmount: -100, weight: 2, distance: 50, isPremium: true, isFragile: false }) === -1`,
    },
    {
      name: "weight が負なら -1",
      code: `calculateShippingFee({ totalAmount: 1000, weight: -1, distance: 50, isPremium: false, isFragile: false }) === -1`,
    },
    {
      name: "distance が負なら -1",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 2, distance: -10, isPremium: false, isFragile: false }) === -1`,
    },
    {
      name: "totalAmount が NaN なら -1",
      code: `calculateShippingFee({ totalAmount: NaN, weight: 2, distance: 50, isPremium: false, isFragile: false }) === -1`,
    },
    {
      name: "weight が NaN なら -1",
      code: `calculateShippingFee({ totalAmount: 1000, weight: NaN, distance: 50, isPremium: false, isFragile: false }) === -1`,
    },
    {
      name: "distance が NaN なら -1",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 2, distance: NaN, isPremium: false, isFragile: false }) === -1`,
    },
    {
      name: "distance が undefined (number でない) なら -1",
      code: `calculateShippingFee({ totalAmount: 1000, weight: 2, distance: undefined, isPremium: false, isFragile: false }) === -1`,
    },
  ],
  hints: [
    "上から順に 「先に判定すべきもの」 を guard 節で並べてください。 入力検証 → プレミアム → 5000円以上 → 通常計算、 の順です。 順番を逆にすると 「プレミアムなのに加算がかかる」 「負の入力で正の運賃が出る」 などのバグになります。",
    "数値の妥当性は 「typeof が number」 「Number.isNaN ではない」 「0 以上」 の 3 条件を 1 つの if (... || ... || ...) にまとめると平坦に書けます。 NaN は !(value >= 0) という書き方で 0 未満と一緒にまとめて弾けます。",
    "距離・重量の加算は範囲分岐です。 まず該当する境界 (>) を if で書き、 上限 (<=) は else if で書くと no-nested-ternary や no-else-return の警告に触れずに済みます。",
    "解答例:\n```js\nfunction calculateShippingFee(order) {\n  const { totalAmount, weight, distance, isPremium, isFragile } = order;\n\n  if (typeof totalAmount !== \"number\" || !(totalAmount >= 0)) {\n    return -1;\n  }\n  if (typeof weight !== \"number\" || !(weight >= 0)) {\n    return -1;\n  }\n  if (typeof distance !== \"number\" || !(distance >= 0)) {\n    return -1;\n  }\n  if (isPremium) {\n    return 0;\n  }\n  if (totalAmount >= 5000) {\n    return 0;\n  }\n\n  let fee = 500;\n  if (distance > 500) {\n    fee += 500;\n  } else if (distance > 100) {\n    fee += 200;\n  }\n  if (weight > 10) {\n    fee += 400;\n  } else if (weight > 5) {\n    fee += 200;\n  }\n  if (isFragile) {\n    fee += 500;\n  }\n  return fee;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "IfStatement", label: "if 文で各仕様の優先順位を表現する" },
        { kind: "node", nodeType: "ReturnStatement", label: "複数の早期 return で平坦に書く" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function calculateShippingFee(order) {
  const { totalAmount, weight, distance, isPremium, isFragile } = order;

  if (typeof totalAmount !== "number" || !(totalAmount >= 0)) {
    return -1;
  }
  if (typeof weight !== "number" || !(weight >= 0)) {
    return -1;
  }
  if (typeof distance !== "number" || !(distance >= 0)) {
    return -1;
  }
  if (isPremium) {
    return 0;
  }
  if (totalAmount >= 5000) {
    return 0;
  }

  let fee = 500;
  if (distance > 500) {
    fee += 500;
  } else if (distance > 100) {
    fee += 200;
  }
  if (weight > 10) {
    fee += 400;
  } else if (weight > 5) {
    fee += 200;
  }
  if (isFragile) {
    fee += 500;
  }
  return fee;
}
`,
  badSolutions: [
    {
      code: `function calculateShippingFee(order) {
  const { totalAmount, weight, distance, isPremium, isFragile } = order;

  if (isPremium) {
    return 0;
  }
  if (totalAmount >= 5000) {
    return 0;
  }

  if (typeof totalAmount !== "number" || !(totalAmount >= 0)) {
    return -1;
  }
  if (typeof weight !== "number" || !(weight >= 0)) {
    return -1;
  }
  if (typeof distance !== "number" || !(distance >= 0)) {
    return -1;
  }

  let fee = 500;
  if (distance > 500) {
    fee += 500;
  } else if (distance > 100) {
    fee += 200;
  }
  if (weight > 10) {
    fee += 400;
  } else if (weight > 5) {
    fee += 200;
  }
  if (isFragile) {
    fee += 500;
  }
  return fee;
}
`,
      description: "入力検証よりも前にプレミアム判定を置いており、 totalAmount が負のプレミアム会員に対して -1 ではなく 0 を返してしまう (テスト失敗)",
    },
    {
      code: `function calculateShippingFee(order) {
  const { totalAmount, weight, distance, isFragile } = order;

  if (typeof totalAmount !== "number" || !(totalAmount >= 0)) {
    return -1;
  }
  if (typeof weight !== "number" || !(weight >= 0)) {
    return -1;
  }
  if (typeof distance !== "number" || !(distance >= 0)) {
    return -1;
  }
  if (totalAmount >= 5000) {
    return 0;
  }

  let fee = 500;
  if (distance > 500) {
    fee += 500;
  } else if (distance > 100) {
    fee += 200;
  }
  if (weight > 10) {
    fee += 400;
  } else if (weight > 5) {
    fee += 200;
  }
  if (isFragile) {
    fee += 500;
  }
  return fee;
}
`,
      description: "プレミアム会員判定をまるごと忘れている。 プレミアム会員でも通常料金が請求されてしまい、 プレミアム関連のテストに失敗する",
    },
    {
      code: `function calculateShippingFee(order) {
  const { totalAmount, weight, distance, isPremium, isFragile } = order;

  if (typeof totalAmount !== "number" || !(totalAmount >= 0)) {
    return -1;
  }
  if (typeof weight !== "number" || !(weight >= 0)) {
    return -1;
  }
  if (typeof distance !== "number" || !(distance >= 0)) {
    return -1;
  }
  if (isPremium) {
    return 0;
  }
  if (totalAmount > 5000) {
    return 0;
  }

  let fee = 500;
  if (distance > 500) {
    fee += 500;
  } else if (distance > 100) {
    fee += 200;
  }
  if (weight > 10) {
    fee += 400;
  } else if (weight > 5) {
    fee += 200;
  }
  if (isFragile) {
    fee += 500;
  }
  return fee;
}
`,
      description: "送料無料閾値の境界判定が >= ではなく > になっており、 totalAmount === 5000 ちょうどの注文が無料にならない (テスト失敗)",
    },
    {
      code: `function calculateShippingFee(order) {
  const { totalAmount, weight, distance, isPremium, isFragile } = order;

  if (typeof totalAmount !== "number" || !(totalAmount >= 0)) {
    return -1;
  }
  if (typeof weight !== "number" || !(weight >= 0)) {
    return -1;
  }
  if (typeof distance !== "number" || !(distance >= 0)) {
    return -1;
  }
  if (isPremium) {
    return 0;
  }
  if (totalAmount >= 5000 && !isFragile) {
    return 0;
  }

  let fee = 500;
  if (distance > 500) {
    fee += 500;
  } else if (distance > 100) {
    fee += 200;
  }
  if (weight > 10) {
    fee += 400;
  } else if (weight > 5) {
    fee += 200;
  }
  if (isFragile) {
    fee += 500;
  }
  return fee;
}
`,
      description: "5000 円以上の無料判定に !isFragile という条件を勝手に足してしまい、 「壊れ物加算もまとめて無料」 という仕様 (壊れ物加算は無料閾値より優先度が低い) に反する。 5000 円以上 + 壊れ物 の注文で 0 ではなく 1000 を返すためテストに失敗する",
    },
  ],
  mdnSections: [
    {
      heading: "if...else",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/if...else",
      pageTitle: "if...else",
    },
    {
      heading: "return",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return",
      pageTitle: "return",
    },
    {
      heading: "分割代入",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment",
      pageTitle: "分割代入",
    },
  ],
};
