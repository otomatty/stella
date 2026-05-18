import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch05VendingMachineTransition: Assignment = {
  id: "S5-Ch05-01-vending-machine-transition",
  stage: "S5",
  chapterId: "Ch05",
  sequence: 1,
  title: "自販機の状態と操作から次の状態を返す",
  newConcept:
    "多次元の状態オブジェクト (status × balance × selectedItem) を、 switch とスプレッド構文で安全に更新する。 入力の state を破壊せず、 新しい state を返す不変更新パターン",
  estimatedMinutes: 55,
  difficulty: 2,
  testKind: "function",
  description: `## やること

自販機の状態 \`state\` と操作 \`action\` を受け取り、 **次の自販機状態を表す新しいオブジェクト** を返す関数 \`applyVendingAction\` を実装してください。

### state の形

\`\`\`js
{
  status: "idle" | "accepting" | "selected",
  balance: number,           // 投入金合計 (0 以上)
  selectedItem: string | null,
  message: string,           // 直前の操作結果を伝える文字列
}
\`\`\`

### 商品と価格 (モジュール先頭に定数で定義)

\`\`\`js
const PRICES = { cola: 150, water: 100, tea: 120 };
\`\`\`

### action の形と状態遷移ルール

**1. \`status === "idle"\` (空っぽ)**
- \`{ type: "insert", amount }\`: \`amount\` が **正の数** なら \`status: "accepting"\` に遷移し \`balance\` を加算
- それ以外の操作は状態を変えず、 \`message\` だけ更新

**2. \`status === "accepting"\` (投入済み、 未選択)**
- \`{ type: "insert", amount }\`: \`amount\` が **正の数** なら \`balance\` を加算
- \`{ type: "select", item }\`:
  - \`PRICES\` に無い商品なら \`message\` で「未対応」 を返し、 状態は変えない
  - \`balance\` が価格未満なら \`message\` で「残高不足」、 状態は変えない
  - そうでなければ \`status: "selected"\`, \`selectedItem\` を更新
- \`{ type: "cancel" }\`: \`status: "idle"\`, \`balance: 0\`, \`selectedItem: null\` に戻す (払戻し)
- \`{ type: "dispense" }\`: 選択前なので状態は変えず、 \`message\` で促す

**3. \`status === "selected"\` (商品を選択済み)**
- \`{ type: "dispense" }\`: \`balance\` から該当商品価格を引き、 \`selectedItem: null\` にする。 残高が 0 になったら \`status: "idle"\`、 残れば \`status: "accepting"\`
- \`{ type: "cancel" }\`: \`status: "idle"\`, \`balance: 0\`, \`selectedItem: null\` に戻す
- それ以外の操作は状態を変えず、 \`message\` で案内

**戻り値は新しいオブジェクト** にしてください (元の \`state\` を変更しない / 同じ参照を返さない)。 \`message\` の文字列内容は自由ですが、 各テストでは状態フィールドの値のみを確認します。

\`\`\`js
const initial = { status: "idle", balance: 0, selectedItem: null, message: "" };

const s1 = applyVendingAction(initial, { type: "insert", amount: 100 });
// → { status: "accepting", balance: 100, selectedItem: null, message: "..." }

const s2 = applyVendingAction(s1, { type: "select", item: "water" });
// → { status: "selected", balance: 100, selectedItem: "water", message: "..." }

const s3 = applyVendingAction(s2, { type: "dispense" });
// → { status: "idle", balance: 0, selectedItem: null, message: "..." }   (残高ぴったり)
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 **多次元の状態 (status × balance × selectedItem) を 1 つのオブジェクトにまとめ、 状態と操作の組み合わせを switch で整理する** 設計を練習します。
- 外側を \`switch (state.status)\` にすると 3 状態が並列に見え、 内側の \`switch (action.type)\` で操作を分けると 「どの (状態, 操作) ペアが何をするか」 が一目で分かります。
- **必ずスプレッド構文 \`{ ...state, ... }\`** で新しいオブジェクトを返してください。 \`state.foo = ...\` のように元のオブジェクトを書き換えると、 履歴が壊れ Redux や React の state とも噛み合いません。
- AST で **\`SwitchStatement\` と \`SpreadElement\` の使用** を必須にしています。 if 連鎖や Object.assign では通りません。
`,
  starterFiles: singleFile(`const PRICES = { cola: 150, water: 100, tea: 120 };

function applyVendingAction(state, action) {
  // 外側の switch で state.status ごとに 3 状態を並べて分岐する

  // idle のとき
  //   投入操作で金額が正なら、 accepting に遷移して balance を加算した新しい state を返す
  //   それ以外は状態を変えず、 message だけを更新した新しい state を返す

  // accepting のとき (内側にもう一段 switch で action.type を分ける)
  //   投入: 金額が正なら balance を加算した state を返す
  //   選択: 商品が PRICES にあり残高が価格以上なら selected に遷移する。 そうでなければ message だけ更新
  //   キャンセル: idle に戻し balance を 0、 selectedItem を null にする
  //   払い出し: 選択前なので状態は変えず案内メッセージのみ

  // selected のとき (こちらも内側に switch)
  //   払い出し: 価格を balance から引き selectedItem を null に。 残高が 0 なら idle、 残れば accepting
  //   キャンセル: idle に戻し balance を 0、 selectedItem を null
  //   それ以外: 状態は変えず message のみ更新

  // どの分岐でも、 必ずスプレッド構文で **新しい state オブジェクト** を返す
}
`),
  entryPoints: ["applyVendingAction"],
  demoCall: `console.log(applyVendingAction({ status: "idle", balance: 0, selectedItem: null, message: "" }, { type: "insert", amount: 100 }));`,
  tests: [
    {
      name: "idle + insert(100) で accepting に遷移し balance が 100 になる",
      code: `(() => {
        const s = applyVendingAction({ status: "idle", balance: 0, selectedItem: null, message: "" }, { type: "insert", amount: 100 });
        return s.status === "accepting" && s.balance === 100 && s.selectedItem === null;
      })()`,
    },
    {
      name: "idle + insert は balance を上書きせず加算する (balance: 50 + amount: 100 = 150)",
      code: `(() => {
        const s = applyVendingAction({ status: "idle", balance: 50, selectedItem: null, message: "" }, { type: "insert", amount: 100 });
        return s.status === "accepting" && s.balance === 150;
      })()`,
    },
    {
      name: "idle + insert で amount が 0 のときは状態を変えない",
      code: `(() => {
        const s = applyVendingAction({ status: "idle", balance: 0, selectedItem: null, message: "" }, { type: "insert", amount: 0 });
        return s.status === "idle" && s.balance === 0;
      })()`,
    },
    {
      name: "idle + select は状態フィールドを 1 つも変えない (status / balance / selectedItem 全て不変、 別オブジェクト)",
      code: `(() => {
        const before = { status: "idle", balance: 0, selectedItem: null, message: "" };
        const after = applyVendingAction(before, { type: "select", item: "water" });
        return after !== before
          && after.status === before.status
          && after.balance === before.balance
          && after.selectedItem === before.selectedItem;
      })()`,
    },
    {
      name: "accepting + insert で balance が加算される",
      code: `(() => {
        const s = applyVendingAction({ status: "accepting", balance: 100, selectedItem: null, message: "" }, { type: "insert", amount: 50 });
        return s.status === "accepting" && s.balance === 150;
      })()`,
    },
    {
      name: "accepting + select(water) で balance が価格以上なら selected に遷移",
      code: `(() => {
        const s = applyVendingAction({ status: "accepting", balance: 100, selectedItem: null, message: "" }, { type: "select", item: "water" });
        return s.status === "selected" && s.selectedItem === "water" && s.balance === 100;
      })()`,
    },
    {
      name: "accepting + select で残高不足のときは状態を変えない",
      code: `(() => {
        const s = applyVendingAction({ status: "accepting", balance: 50, selectedItem: null, message: "" }, { type: "select", item: "cola" });
        return s.status === "accepting" && s.selectedItem === null && s.balance === 50;
      })()`,
    },
    {
      name: "accepting + select で未対応商品は状態を変えない",
      code: `(() => {
        const s = applyVendingAction({ status: "accepting", balance: 500, selectedItem: null, message: "" }, { type: "select", item: "coffee" });
        return s.status === "accepting" && s.selectedItem === null && s.balance === 500;
      })()`,
    },
    {
      name: "accepting + cancel で idle に戻り balance が 0 になる",
      code: `(() => {
        const s = applyVendingAction({ status: "accepting", balance: 300, selectedItem: null, message: "" }, { type: "cancel" });
        return s.status === "idle" && s.balance === 0 && s.selectedItem === null;
      })()`,
    },
    {
      name: "accepting + dispense (未選択) は状態フィールドを 1 つも変えない (status / balance / selectedItem 全て不変、 別オブジェクト)",
      code: `(() => {
        const before = { status: "accepting", balance: 100, selectedItem: null, message: "" };
        const after = applyVendingAction(before, { type: "dispense" });
        return after !== before
          && after.status === before.status
          && after.balance === before.balance
          && after.selectedItem === before.selectedItem;
      })()`,
    },
    {
      name: "selected + dispense で残高ぴったりなら idle に戻る",
      code: `(() => {
        const s = applyVendingAction({ status: "selected", balance: 150, selectedItem: "cola", message: "" }, { type: "dispense" });
        return s.status === "idle" && s.balance === 0 && s.selectedItem === null;
      })()`,
    },
    {
      name: "selected + dispense で残高が残るなら accepting に戻る",
      code: `(() => {
        const s = applyVendingAction({ status: "selected", balance: 200, selectedItem: "water", message: "" }, { type: "dispense" });
        return s.status === "accepting" && s.balance === 100 && s.selectedItem === null;
      })()`,
    },
    {
      name: "selected + cancel で idle に戻り balance と selectedItem がリセットされる",
      code: `(() => {
        const s = applyVendingAction({ status: "selected", balance: 200, selectedItem: "tea", message: "" }, { type: "cancel" });
        return s.status === "idle" && s.balance === 0 && s.selectedItem === null;
      })()`,
    },
    {
      name: "元の state は dispense でも書き換えられない (immutability)",
      code: `(() => {
        const before = { status: "selected", balance: 150, selectedItem: "cola", message: "" };
        applyVendingAction(before, { type: "dispense" });
        return before.status === "selected" && before.balance === 150 && before.selectedItem === "cola";
      })()`,
    },
    {
      name: "元の state は cancel でも書き換えられない",
      code: `(() => {
        const before = { status: "accepting", balance: 200, selectedItem: null, message: "" };
        applyVendingAction(before, { type: "cancel" });
        return before.status === "accepting" && before.balance === 200;
      })()`,
    },
    {
      name: "戻り値は元の state とは別オブジェクト",
      code: `(() => {
        const before = { status: "idle", balance: 0, selectedItem: null, message: "" };
        const after = applyVendingAction(before, { type: "insert", amount: 100 });
        return after !== before;
      })()`,
    },
    {
      name: "idle + select (no-op) でも戻り値は別オブジェクト",
      code: `(() => {
        const before = { status: "idle", balance: 0, selectedItem: null, message: "" };
        const after = applyVendingAction(before, { type: "select", item: "water" });
        return after !== before;
      })()`,
    },
    {
      name: "accepting + dispense (no-op) でも戻り値は別オブジェクト",
      code: `(() => {
        const before = { status: "accepting", balance: 100, selectedItem: null, message: "" };
        const after = applyVendingAction(before, { type: "dispense" });
        return after !== before;
      })()`,
    },
  ],
  hints: [
    "外側で switch (state.status) を書き、 内側で switch (action.type) を書く 2 段構造にすると 「どの状態でどの操作が来たか」 が表形式で並んで読みやすくなります。",
    "状態は変えないが message だけ更新したい場合も、 必ず { ...state, message: ... } のスプレッドで新しいオブジェクトを返すこと。 元の state を破壊しないのが S5 の不変更新パターンです。",
    "残高ぴったりで払い出した後の遷移 (idle へ戻すか accepting に残すか) は、 dispense 後の残高で三項演算子 1 つで分岐できます: status: remaining > 0 ? \"accepting\" : \"idle\"",
    "解答例:\n```js\nconst PRICES = { cola: 150, water: 100, tea: 120 };\n\nfunction applyVendingAction(state, action) {\n  switch (state.status) {\n    case \"idle\": {\n      if (action.type === \"insert\" && typeof action.amount === \"number\" && action.amount > 0) {\n        return { ...state, status: \"accepting\", balance: state.balance + action.amount, message: \"投入を受け付けました\" };\n      }\n      return { ...state, message: \"先にお金を投入してください\" };\n    }\n    case \"accepting\": {\n      switch (action.type) {\n        case \"insert\":\n          if (typeof action.amount !== \"number\" || !(action.amount > 0)) {\n            return { ...state, message: \"不正な投入金額です\" };\n          }\n          return { ...state, balance: state.balance + action.amount, message: \"追加投入を受け付けました\" };\n        case \"select\": {\n          const price = PRICES[action.item];\n          if (typeof price !== \"number\") {\n            return { ...state, message: \"未対応の商品です\" };\n          }\n          if (state.balance < price) {\n            return { ...state, message: \"残高不足です\" };\n          }\n          return { ...state, status: \"selected\", selectedItem: action.item, message: \"商品を選択しました\" };\n        }\n        case \"cancel\":\n          return { ...state, status: \"idle\", balance: 0, selectedItem: null, message: \"投入金を返却しました\" };\n        case \"dispense\":\n          return { ...state, message: \"商品を選択してください\" };\n        default:\n          return { ...state, message: \"未対応の操作です\" };\n      }\n    }\n    case \"selected\": {\n      switch (action.type) {\n        case \"dispense\": {\n          const remaining = state.balance - PRICES[state.selectedItem];\n          return {\n            ...state,\n            status: remaining > 0 ? \"accepting\" : \"idle\",\n            balance: remaining,\n            selectedItem: null,\n            message: \"商品を払い出しました\",\n          };\n        }\n        case \"cancel\":\n          return { ...state, status: \"idle\", balance: 0, selectedItem: null, message: \"投入金を返却しました\" };\n        default:\n          return { ...state, message: \"先の選択をキャンセルするか払い出してください\" };\n      }\n    }\n    default:\n      return { ...state, message: \"未対応の状態です\" };\n  }\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "SwitchStatement", label: "switch 文で状態または操作を分ける" },
        { kind: "node", nodeType: "SpreadElement", label: "スプレッド構文 ({ ...state }) で新しい state を返す" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で新しい state を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `const PRICES = { cola: 150, water: 100, tea: 120 };

function applyVendingAction(state, action) {
  switch (state.status) {
    case "idle": {
      if (action.type === "insert" && typeof action.amount === "number" && action.amount > 0) {
        return { ...state, status: "accepting", balance: state.balance + action.amount, message: "投入を受け付けました" };
      }
      return { ...state, message: "先にお金を投入してください" };
    }
    case "accepting": {
      switch (action.type) {
        case "insert":
          if (typeof action.amount !== "number" || !(action.amount > 0)) {
            return { ...state, message: "不正な投入金額です" };
          }
          return { ...state, balance: state.balance + action.amount, message: "追加投入を受け付けました" };
        case "select": {
          const price = PRICES[action.item];
          if (typeof price !== "number") {
            return { ...state, message: "未対応の商品です" };
          }
          if (state.balance < price) {
            return { ...state, message: "残高不足です" };
          }
          return { ...state, status: "selected", selectedItem: action.item, message: "商品を選択しました" };
        }
        case "cancel":
          return { ...state, status: "idle", balance: 0, selectedItem: null, message: "投入金を返却しました" };
        case "dispense":
          return { ...state, message: "商品を選択してください" };
        default:
          return { ...state, message: "未対応の操作です" };
      }
    }
    case "selected": {
      switch (action.type) {
        case "dispense": {
          const remaining = state.balance - PRICES[state.selectedItem];
          return {
            ...state,
            status: remaining > 0 ? "accepting" : "idle",
            balance: remaining,
            selectedItem: null,
            message: "商品を払い出しました",
          };
        }
        case "cancel":
          return { ...state, status: "idle", balance: 0, selectedItem: null, message: "投入金を返却しました" };
        default:
          return { ...state, message: "先の選択をキャンセルするか払い出してください" };
      }
    }
    default:
      return { ...state, message: "未対応の状態です" };
  }
}
`,
  badSolutions: [
    {
      code: `const PRICES = { cola: 150, water: 100, tea: 120 };

function applyVendingAction(state, action) {
  if (state.status === "idle") {
    if (action.type === "insert" && action.amount > 0) {
      state.status = "accepting";
      state.balance = action.amount;
    }
    return state;
  }
  if (state.status === "accepting") {
    if (action.type === "insert" && action.amount > 0) {
      state.balance += action.amount;
    } else if (action.type === "select" && PRICES[action.item] !== undefined && state.balance >= PRICES[action.item]) {
      state.status = "selected";
      state.selectedItem = action.item;
    } else if (action.type === "cancel") {
      state.status = "idle";
      state.balance = 0;
      state.selectedItem = null;
    }
    return state;
  }
  if (state.status === "selected") {
    if (action.type === "dispense") {
      const remaining = state.balance - PRICES[state.selectedItem];
      state.balance = remaining;
      state.selectedItem = null;
      state.status = remaining > 0 ? "accepting" : "idle";
    } else if (action.type === "cancel") {
      state.status = "idle";
      state.balance = 0;
      state.selectedItem = null;
    }
    return state;
  }
  return state;
}
`,
      description: "if 連鎖で書いており、 switch (AST required) を使っていない。 さらに元の state を直接書き換えているので immutability テストにも失敗する",
    },
    {
      code: `const PRICES = { cola: 150, water: 100, tea: 120 };

function applyVendingAction(state, action) {
  switch (state.status) {
    case "idle": {
      if (action.type === "insert" && action.amount > 0) {
        return Object.assign({}, state, { status: "accepting", balance: action.amount });
      }
      return Object.assign({}, state);
    }
    case "accepting": {
      switch (action.type) {
        case "insert":
          return Object.assign({}, state, { balance: state.balance + action.amount });
        case "select":
          if (PRICES[action.item] !== undefined && state.balance >= PRICES[action.item]) {
            return Object.assign({}, state, { status: "selected", selectedItem: action.item });
          }
          return Object.assign({}, state);
        case "cancel":
          return Object.assign({}, state, { status: "idle", balance: 0, selectedItem: null });
        default:
          return Object.assign({}, state);
      }
    }
    case "selected": {
      switch (action.type) {
        case "dispense": {
          const remaining = state.balance - PRICES[state.selectedItem];
          return Object.assign({}, state, { status: remaining > 0 ? "accepting" : "idle", balance: remaining, selectedItem: null });
        }
        case "cancel":
          return Object.assign({}, state, { status: "idle", balance: 0, selectedItem: null });
        default:
          return Object.assign({}, state);
      }
    }
    default:
      return Object.assign({}, state);
  }
}
`,
      description: "Object.assign で新オブジェクトを作っており、 スプレッド構文 (AST required: SpreadElement) を使っていない",
    },
    {
      code: `const PRICES = { cola: 150, water: 100, tea: 120 };

function applyVendingAction(state, action) {
  switch (state.status) {
    case "idle": {
      if (action.type === "insert" && action.amount > 0) {
        return { ...state, status: "accepting", balance: action.amount };
      }
      return { ...state };
    }
    case "accepting": {
      switch (action.type) {
        case "insert":
          return { ...state, balance: state.balance + action.amount };
        case "select":
          if (PRICES[action.item] !== undefined && state.balance >= PRICES[action.item]) {
            return { ...state, status: "selected", selectedItem: action.item };
          }
          return { ...state };
        case "cancel":
          return { ...state, status: "accepting", balance: state.balance, selectedItem: null };
        default:
          return { ...state };
      }
    }
    case "selected": {
      switch (action.type) {
        case "dispense": {
          const remaining = state.balance - PRICES[state.selectedItem];
          return { ...state, status: remaining > 0 ? "accepting" : "idle", balance: remaining, selectedItem: null };
        }
        case "cancel":
          return { ...state, status: "idle", balance: 0, selectedItem: null };
        default:
          return { ...state };
      }
    }
    default:
      return { ...state };
  }
}
`,
      description: "accepting + cancel のときに idle へ戻さず balance も 0 にしていないので、 払戻しテストに失敗する",
    },
    {
      code: `const PRICES = { cola: 150, water: 100, tea: 120 };

function applyVendingAction(state, action) {
  switch (state.status) {
    case "idle": {
      if (action.type === "insert" && action.amount > 0) {
        return { ...state, status: "accepting", balance: action.amount };
      }
      return { ...state };
    }
    case "accepting": {
      switch (action.type) {
        case "insert":
          return { ...state, balance: state.balance + action.amount };
        case "select":
          return { ...state, status: "selected", selectedItem: action.item };
        case "cancel":
          return { ...state, status: "idle", balance: 0, selectedItem: null };
        default:
          return { ...state };
      }
    }
    case "selected": {
      switch (action.type) {
        case "dispense": {
          const remaining = state.balance - PRICES[state.selectedItem];
          return { ...state, status: remaining > 0 ? "accepting" : "idle", balance: remaining, selectedItem: null };
        }
        case "cancel":
          return { ...state, status: "idle", balance: 0, selectedItem: null };
        default:
          return { ...state };
      }
    }
    default:
      return { ...state };
  }
}
`,
      description: "accepting + select のときに 残高不足 / 未対応商品 のチェックを省いており、 残高 50 で cola (150) を選んだときにそのまま selected に遷移してしまう (テスト失敗)",
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
    {
      heading: "ステートマシン (状態機械)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Glossary/State_machine",
      pageTitle: "ステートマシン",
    },
  ],
};
