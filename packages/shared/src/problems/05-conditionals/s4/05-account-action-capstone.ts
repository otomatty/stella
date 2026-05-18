import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch05AccountActionCapstone: Assignment = {
  id: "S4-Ch05-05-account-action-capstone",
  stage: "S4",
  chapterId: "Ch05",
  sequence: 5,
  title: "[卒業課題] 口座状態と操作から次の状態を返す",
  newConcept: "switch (状態) と ガード節 (操作の前提条件) を組み合わせた小さな状態機械",
  estimatedMinutes: 40,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

口座 \`account\` と 操作 \`action\` を受け取り、 **次の口座状態を表す新しいオブジェクト** を返す関数 \`applyAccountAction\` を実装してください。 遷移が認められない場合は \`null\` を返します。

- \`account\` は \`{ status: "open" | "frozen" | "closed", balance: number }\`
- \`action\` は \`{ type: "deposit" | "withdraw" | "freeze" | "unfreeze" | "close", amount?: number }\`

### 遷移ルール

**1. \`account.status === "closed"\`**
- すべての操作で \`null\` を返す (閉じた口座は何もできない)。

**2. \`account.status === "frozen"\`**
- \`action.type === "unfreeze"\` のみ受け付ける → \`{ status: "open", balance }\` を返す。
- それ以外の操作は \`null\`。

**3. \`account.status === "open"\`**
- \`action.type === "deposit"\`: \`amount\` が **正の数 (> 0)** なら \`balance + amount\` を持つ \`{ status: "open", balance: ... }\` を返す。 そうでなければ \`null\`。
- \`action.type === "withdraw"\`: \`amount\` が **正の数** かつ \`balance >= amount\` なら \`{ status: "open", balance: balance - amount }\` を返す。 そうでなければ \`null\` (残高不足 / 不正額)。
- \`action.type === "freeze"\`: \`{ status: "frozen", balance }\` を返す。
- \`action.type === "close"\`: \`{ status: "closed", balance }\` を返す。
- \`action.type === "unfreeze"\`: すでに open なので \`null\` を返す。
- 未知の \`type\` も \`null\`。

**戻り値の \`account\` は新しいオブジェクト** にしてください (元の \`account\` を変更しない / 同じ参照を返さない)。

\`\`\`js
applyAccountAction({ status: "open", balance: 100 }, { type: "deposit", amount: 50 });
// → { status: "open", balance: 150 }

applyAccountAction({ status: "open", balance: 100 }, { type: "withdraw", amount: 200 });
// → null   (残高不足)

applyAccountAction({ status: "open", balance: 100 }, { type: "freeze" });
// → { status: "frozen", balance: 100 }

applyAccountAction({ status: "frozen", balance: 100 }, { type: "unfreeze" });
// → { status: "open", balance: 100 }

applyAccountAction({ status: "frozen", balance: 100 }, { type: "deposit", amount: 10 });
// → null   (凍結中は入金不可)

applyAccountAction({ status: "closed", balance: 0 }, { type: "deposit", amount: 10 });
// → null   (閉鎖済み)
\`\`\`

## ポイント

- これは S4 卒業課題のひとつです。 **状態 (status) ごとに大きく分岐** し、 その内側で **操作の前提条件をガード節で弾く** という 2 段構えで書きます。
- 外側を \`switch (account.status)\` にすると 3 つの状態が見やすく並びます。 \`open\` の中はさらに \`switch (action.type)\` で操作を分けると整理できます。
- 残高更新時に **元のオブジェクトを変更しない** よう、 \`{ ...account, balance: ... }\` のようにスプレッドで新しいオブジェクトを返します。
- 「不正な額」 と「残高不足」 は両方とも \`null\` を返すので、 \`amount > 0 && balance >= amount\` のように **複合条件** を組み立てるとすっきりします。
`,
  starterFiles: singleFile(`function applyAccountAction(account, action) {
  // 1. switch (account.status) で状態ごとに分岐
  //    - "closed" → null
  //    - "frozen" → unfreeze だけ受け付け、 それ以外は null
  //    - "open"   → action.type に応じて新しい account を返す。 不正なら null
  // 2. 戻り値は元の account を変更せず、 新しいオブジェクトにする
}
`),
  entryPoints: ["applyAccountAction"],
  demoCall: `console.log(applyAccountAction({ status: "open", balance: 100 }, { type: "deposit", amount: 50 }));`,
  tests: [
    {
      name: "open + deposit で残高が増える",
      code: `(() => {
        const r = applyAccountAction({ status: "open", balance: 100 }, { type: "deposit", amount: 50 });
        return r !== null && r.status === "open" && r.balance === 150;
      })()`,
    },
    {
      name: "open + withdraw で残高が減る",
      code: `(() => {
        const r = applyAccountAction({ status: "open", balance: 100 }, { type: "withdraw", amount: 40 });
        return r !== null && r.status === "open" && r.balance === 60;
      })()`,
    },
    {
      name: "残高ちょうどの withdraw も OK (balance: 0)",
      code: `(() => {
        const r = applyAccountAction({ status: "open", balance: 100 }, { type: "withdraw", amount: 100 });
        return r !== null && r.status === "open" && r.balance === 0;
      })()`,
    },
    {
      name: "残高不足の withdraw は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "withdraw", amount: 200 }) === null`,
    },
    {
      name: "amount が 0 以下の deposit は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "deposit", amount: 0 }) === null`,
    },
    {
      name: "amount 未指定の deposit は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "deposit" }) === null`,
    },
    {
      name: "amount が負の withdraw は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "withdraw", amount: -10 }) === null`,
    },
    {
      name: "amount 未指定の withdraw は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "withdraw" }) === null`,
    },
    {
      name: "amount が NaN の deposit は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "deposit", amount: NaN }) === null`,
    },
    {
      name: "amount が NaN の withdraw は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "withdraw", amount: NaN }) === null`,
    },
    {
      name: "open + freeze で frozen になる",
      code: `(() => {
        const r = applyAccountAction({ status: "open", balance: 100 }, { type: "freeze" });
        return r !== null && r.status === "frozen" && r.balance === 100;
      })()`,
    },
    {
      name: "open + close で closed になる",
      code: `(() => {
        const r = applyAccountAction({ status: "open", balance: 100 }, { type: "close" });
        return r !== null && r.status === "closed" && r.balance === 100;
      })()`,
    },
    {
      name: "open + unfreeze は null (すでに open)",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "unfreeze" }) === null`,
    },
    {
      name: "open + 未知の type は null",
      code: `applyAccountAction({ status: "open", balance: 100 }, { type: "transfer", amount: 10 }) === null`,
    },
    {
      name: "frozen + unfreeze で open に戻る",
      code: `(() => {
        const r = applyAccountAction({ status: "frozen", balance: 100 }, { type: "unfreeze" });
        return r !== null && r.status === "open" && r.balance === 100;
      })()`,
    },
    {
      name: "frozen + deposit は null",
      code: `applyAccountAction({ status: "frozen", balance: 100 }, { type: "deposit", amount: 50 }) === null`,
    },
    {
      name: "frozen + withdraw は null",
      code: `applyAccountAction({ status: "frozen", balance: 100 }, { type: "withdraw", amount: 50 }) === null`,
    },
    {
      name: "closed は何をしても null (5 種類の action 全て)",
      code: `(() => {
        const account = { status: "closed", balance: 0 };
        const actions = [
          { type: "deposit", amount: 10 },
          { type: "withdraw", amount: 10 },
          { type: "freeze" },
          { type: "close" },
          { type: "unfreeze" },
        ];
        return actions.every((a) => applyAccountAction(account, a) === null);
      })()`,
    },
    {
      name: "元の account は deposit でも変更されない",
      code: `(() => {
        const before = { status: "open", balance: 100 };
        applyAccountAction(before, { type: "deposit", amount: 50 });
        return before.status === "open" && before.balance === 100;
      })()`,
    },
    {
      name: "元の account は withdraw でも変更されない",
      code: `(() => {
        const before = { status: "open", balance: 100 };
        applyAccountAction(before, { type: "withdraw", amount: 40 });
        return before.status === "open" && before.balance === 100;
      })()`,
    },
    {
      name: "元の account は freeze でも変更されない",
      code: `(() => {
        const before = { status: "open", balance: 100 };
        applyAccountAction(before, { type: "freeze" });
        return before.status === "open" && before.balance === 100;
      })()`,
    },
    {
      name: "元の account は close でも変更されない",
      code: `(() => {
        const before = { status: "open", balance: 100 };
        applyAccountAction(before, { type: "close" });
        return before.status === "open" && before.balance === 100;
      })()`,
    },
    {
      name: "元の account は frozen→unfreeze でも変更されない",
      code: `(() => {
        const before = { status: "frozen", balance: 100 };
        applyAccountAction(before, { type: "unfreeze" });
        return before.status === "frozen" && before.balance === 100;
      })()`,
    },
    {
      name: "拒否される操作 (null を返す経路) でも元の account は変更されない",
      code: `(() => {
        const cases = [
          [{ status: "open", balance: 100 }, { type: "withdraw", amount: 200 }],
          [{ status: "open", balance: 100 }, { type: "deposit", amount: 0 }],
          [{ status: "open", balance: 100 }, { type: "deposit", amount: -5 }],
          [{ status: "open", balance: 100 }, { type: "deposit", amount: NaN }],
          [{ status: "open", balance: 100 }, { type: "withdraw" }],
          [{ status: "open", balance: 100 }, { type: "transfer", amount: 10 }],
          [{ status: "open", balance: 100 }, { type: "unfreeze" }],
          [{ status: "frozen", balance: 50 }, { type: "deposit", amount: 10 }],
          [{ status: "frozen", balance: 50 }, { type: "withdraw", amount: 10 }],
          [{ status: "closed", balance: 0 }, { type: "deposit", amount: 10 }],
          [{ status: "closed", balance: 0 }, { type: "unfreeze" }],
        ];
        for (const [before, action] of cases) {
          const snap = { status: before.status, balance: before.balance };
          applyAccountAction(before, action);
          if (before.status !== snap.status || before.balance !== snap.balance) {
            return false;
          }
        }
        return true;
      })()`,
    },
    {
      name: "戻り値は元の account とは別オブジェクト",
      code: `(() => {
        const before = { status: "open", balance: 100 };
        const after = applyAccountAction(before, { type: "freeze" });
        return after !== before;
      })()`,
    },
  ],
  hints: [
    "外側で switch (account.status)、 open の中でさらに switch (action.type)。 closed は問答無用で null。",
    "deposit / withdraw の amount チェックは !(amount > 0) を共通条件にし (こう書くと NaN もまとめて弾ける)、 withdraw は balance >= amount も合わせて確認する。",
    "戻り値は { ...account, status: ..., balance: ... } のスプレッドで新しいオブジェクトにする。",
    "解答例:\n```js\nfunction applyAccountAction(account, action) {\n  switch (account.status) {\n    case \"closed\":\n      return null;\n    case \"frozen\":\n      if (action.type === \"unfreeze\") {\n        return { ...account, status: \"open\" };\n      }\n      return null;\n    case \"open\":\n      switch (action.type) {\n        case \"deposit\":\n          if (typeof action.amount !== \"number\" || !(action.amount > 0)) {\n            return null;\n          }\n          return { ...account, balance: account.balance + action.amount };\n        case \"withdraw\":\n          if (\n            typeof action.amount !== \"number\" ||\n            !(action.amount > 0) ||\n            account.balance < action.amount\n          ) {\n            return null;\n          }\n          return { ...account, balance: account.balance - action.amount };\n        case \"freeze\":\n          return { ...account, status: \"frozen\" };\n        case \"close\":\n          return { ...account, status: \"closed\" };\n        default:\n          return null;\n      }\n    default:\n      return null;\n  }\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "SwitchStatement", label: "switch 文で状態または操作を分ける" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で次の状態または null を返す" },
        { kind: "node", nodeType: "SpreadElement", label: "スプレッド構文 ({ ...account }) で新しいオブジェクトを返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function applyAccountAction(account, action) {
  switch (account.status) {
    case "closed":
      return null;
    case "frozen":
      if (action.type === "unfreeze") {
        return { ...account, status: "open" };
      }
      return null;
    case "open":
      switch (action.type) {
        case "deposit":
          if (typeof action.amount !== "number" || !(action.amount > 0)) {
            return null;
          }
          return { ...account, balance: account.balance + action.amount };
        case "withdraw":
          if (
            typeof action.amount !== "number" ||
            !(action.amount > 0) ||
            account.balance < action.amount
          ) {
            return null;
          }
          return { ...account, balance: account.balance - action.amount };
        case "freeze":
          return { ...account, status: "frozen" };
        case "close":
          return { ...account, status: "closed" };
        default:
          return null;
      }
    default:
      return null;
  }
}
`,
  badSolutions: [
    {
      code: `function applyAccountAction(account, action) {
  if (account.status === "closed") return null;
  if (account.status === "frozen") {
    if (action.type === "unfreeze") {
      account.status = "open";
      return account;
    }
    return null;
  }
  if (action.type === "deposit") {
    account.balance += action.amount;
    return account;
  }
  if (action.type === "withdraw") {
    if (account.balance < action.amount) return null;
    account.balance -= action.amount;
    return account;
  }
  if (action.type === "freeze") {
    account.status = "frozen";
    return account;
  }
  if (action.type === "close") {
    account.status = "closed";
    return account;
  }
  return null;
}
`,
      description: "元の account を直接変更しており、 また switch とスプレッドを使っていない (AST + テスト失敗)",
    },
    {
      code: `function applyAccountAction(account, action) {
  switch (account.status) {
    case "closed":
      return null;
    case "frozen":
      if (action.type === "unfreeze") {
        return { ...account, status: "open" };
      }
      return null;
    case "open":
      switch (action.type) {
        case "deposit":
          return { ...account, balance: account.balance + action.amount };
        case "withdraw":
          return { ...account, balance: account.balance - action.amount };
        case "freeze":
          return { ...account, status: "frozen" };
        case "close":
          return { ...account, status: "closed" };
        default:
          return null;
      }
    default:
      return null;
  }
}
`,
      description: "deposit / withdraw の amount 検証と残高チェックを省いている (テスト失敗)",
    },
    {
      code: `function applyAccountAction(account, action) {
  switch (account.status) {
    case "closed":
      return null;
    case "frozen":
      if (action.type === "unfreeze") {
        return { ...account, status: "open" };
      }
      return null;
    case "open":
      switch (action.type) {
        case "deposit":
          if (typeof action.amount !== "number" || action.amount <= 0) {
            return null;
          }
          return { ...account, balance: account.balance + action.amount };
        case "withdraw":
          if (
            typeof action.amount !== "number" ||
            action.amount <= 0 ||
            account.balance < action.amount
          ) {
            return null;
          }
          return { ...account, balance: account.balance - action.amount };
        case "freeze":
          return { ...account, status: "frozen" };
        case "close":
          return { ...account, status: "closed" };
        default:
          return null;
      }
    default:
      return null;
  }
}
`,
      description: "amount <= 0 で弾いており NaN がすり抜けて balance が NaN になる (NaN <= 0 は false のため。 !(amount > 0) と書くと NaN もまとめて弾ける)",
    },
  ],
  mdnSections: [
    {
      heading: "switch",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/switch",
      pageTitle: "switch",
    },
    {
      heading: "スプレッド構文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      pageTitle: "スプレッド構文",
    },
  ],
};
