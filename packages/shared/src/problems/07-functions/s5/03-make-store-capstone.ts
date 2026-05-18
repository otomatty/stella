import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch07MakeStoreCapstone: Assignment = {
  id: "S5-Ch07-03-make-store-capstone",
  stage: "S5",
  chapterId: "Ch07",
  sequence: 3,
  title: "[卒業課題] makeStore: state と購読者を 1 つのクロージャに閉じ込め 4 関数の API を返す",
  newConcept:
    "クロージャに state と Set<listener> を閉じ込め、 setState (更新関数を引数で受ける高階関数) / subscribe (解除関数を返す) / getState / getListenerCount の 4 つの関数を 1 つのオブジェクトとして協調させる、 Ch07 の集大成",
  estimatedMinutes: 75,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

これは **Ch07 関数の S5 卒業課題** です。 Redux 風の超小型ストアを作ります。 \`makeStore(initialState)\` を呼ぶと、 **4 つの関数を持つオブジェクト** が返り、 それらが **1 つのクロージャ** で内部状態を共有します。

### 返すべき API

\`\`\`js
const store = makeStore(initialState);

store.getState();                  // 現在の state を返す
store.setState(updater);           // updater = (prev) => next。 state を next に更新し、 全 listener を next で通知する
const unsub = store.subscribe(listener);  // listener を登録。 解除関数を返す
unsub();                           // この listener を購読解除する
store.getListenerCount();          // 現在登録されている listener の数 (デバッグ・テスト用)
\`\`\`

### 振る舞いの詳細

- **setState は 「更新関数」 を引数で受け取る** こと。 値そのものではなく、 \`(prev) => next\` の関数。 これで 「前の値からどう変えるか」 をユーザ側で純粋に書ける。 例: \`store.setState((n) => n + 1)\`
- 更新後は **全 listener を新しい state で呼ぶ** 通知ステップを行う。 通知は \`setState\` の中で同期的に。
- **subscribe は解除関数 \`() => void\` を返す**。 解除関数を呼ぶとその listener が以降の通知を受け取らなくなる。
- 購読者集合は **\`new Set()\` で管理する**。 これにより、 **同じ listener を 2 回 subscribe しても 1 度しか通知が行かない** (重複排除)。 解除も Set.delete で O(1)。
- ストアは独立したクロージャ。 異なる \`makeStore\` 呼び出しで作られたストアは **互いの state や listener を共有しない**。
- \`getListenerCount()\` は内部の Set のサイズを返すだけ。 テストや外部ツールが状態を観察できるように。

\`\`\`js
const store = makeStore(0);
store.getState();                          // → 0
store.getListenerCount();                  // → 0

let seen = [];
const unsub = store.subscribe((n) => { seen.push(n); });
store.getListenerCount();                  // → 1

store.setState((prev) => prev + 1);
store.getState();                          // → 1
seen;                                      // → [1]

store.setState((prev) => prev * 10);
store.getState();                          // → 10
seen;                                      // → [1, 10]

unsub();
store.getListenerCount();                  // → 0
store.setState((prev) => prev + 100);
seen;                                      // → [1, 10]   (もう通知されない)
\`\`\`

## ポイント

- これは S5 卒業課題です。 S5 全体のテーマ — 「**複数関数の連携 (クロージャ共有)**」 「**関数を引数で受ける高階関数 (setState の updater)**」 「**純粋関数による状態更新 (updater は外側から渡される純粋関数)**」 「**設計判断を伴う関数分割**」 — を 1 問にまとめた統合演習。
- 推奨フロー:
  1. \`function makeStore(initialState)\` の本体で **\`let state = initialState\`** と **\`const listeners = new Set()\`** を用意する (この 2 つが共有クロージャ変数)
  2. 4 つのメンバーを持つ **オブジェクトリテラル** を return する。 各メンバーは アロー関数 で書く
  3. \`getState: () => state\` — 1 行
  4. \`setState: (updater) => { state = updater(state); listeners を for...of で呼ぶ; }\` — updater は **関数引数**。 通知時に渡すのは 「**更新後の state**」 であること
  5. \`subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }\` — 解除関数を 1 行で返す
  6. \`getListenerCount: () => listeners.size\` — 1 行
- setState の updater は **値 next ではなく関数** であることが必須。 「値を直接受け取る形」 で書くと、 関数を引数として渡す高階関数のテーマが消えます。 テストでは \`store.setState((prev) => prev + 1)\` の形で呼ぶので、 値を受ける形にすると state が関数オブジェクトになって失敗します。
- 「同じ listener を 2 回登録しても 1 度しか通知が行かない」 という重複排除は **\`Set\`** に任せる。 配列で実装すると重複排除のロジックを自分で書く必要があり、 設計判断としても適切ではありません。
- AST で **\`FunctionDeclaration\`** (\`makeStore\` 本体)、 **\`ArrowFunctionExpression\`** (4 つのメソッドはアロー関数)、 **\`NewExpression\`** (\`new Set()\`)、 **\`ReturnStatement\`** を必須にしています。
`,
  starterFiles: singleFile(`function makeStore(initialState) {
  // 1) クロージャに閉じ込める内部状態を 2 つ用意する。
  //    let state = initialState;
  //    const listeners = new Set();   // 重複登録は無視したい
  //
  // 2) 4 つの関数を含むオブジェクトを return する。
  //    すべて アロー関数 で書く。
  //
  //    - getState:     現在の state を返す
  //    - setState:     updater (関数) を受け取り state = updater(state) で更新、
  //                    全 listener を 新しい state で 同期的に通知する
  //    - subscribe:    listener を Set に追加し、 解除関数 () => listeners.delete(listener) を返す
  //    - getListenerCount: listeners.size を返す
}
`),
  entryPoints: ["makeStore"],
  demoCall: `(() => {
  const store = makeStore(0);
  store.subscribe((n) => console.log("listener saw", n));
  store.setState((prev) => prev + 1);
  console.log("final =", store.getState());
})();`,
  tests: [
    {
      name: "getState は initialState を返す",
      code: `makeStore(42).getState() === 42`,
    },
    {
      name: "getState は オブジェクトの initialState もそのまま返す",
      code: `(() => {
        const obj = { count: 0 };
        const store = makeStore(obj);
        return store.getState() === obj;
      })()`,
    },
    {
      name: "setState は updater(prev) の戻り値を新しい state にする",
      code: `(() => {
        const store = makeStore(10);
        store.setState((prev) => prev + 5);
        return store.getState() === 15;
      })()`,
    },
    {
      name: "setState の updater は 前の state を引数で受け取る",
      code: `(() => {
        const store = makeStore(3);
        let received = null;
        store.setState((prev) => { received = prev; return prev * 2; });
        return received === 3 && store.getState() === 6;
      })()`,
    },
    {
      name: "subscribe した listener が setState 後に呼ばれる",
      code: `(() => {
        const store = makeStore(0);
        let called = false;
        store.subscribe(() => { called = true; });
        store.setState((prev) => prev + 1);
        return called === true;
      })()`,
    },
    {
      name: "listener は 新しい state を引数で受け取る (古い state ではない)",
      code: `(() => {
        const store = makeStore(0);
        let lastSeen = null;
        store.subscribe((n) => { lastSeen = n; });
        store.setState((prev) => prev + 10);
        return lastSeen === 10;
      })()`,
    },
    {
      name: "複数の listener がすべて呼ばれる",
      code: `(() => {
        const store = makeStore(0);
        let a = 0;
        let b = 0;
        store.subscribe(() => { a += 1; });
        store.subscribe(() => { b += 1; });
        store.setState((prev) => prev + 1);
        store.setState((prev) => prev + 1);
        return a === 2 && b === 2;
      })()`,
    },
    {
      name: "subscribe は 購読解除関数を返す",
      code: `typeof makeStore(0).subscribe(() => {}) === "function"`,
    },
    {
      name: "解除関数を呼ぶと以降の通知が来なくなる",
      code: `(() => {
        const store = makeStore(0);
        let calls = 0;
        const unsub = store.subscribe(() => { calls += 1; });
        store.setState((prev) => prev + 1);
        unsub();
        store.setState((prev) => prev + 1);
        store.setState((prev) => prev + 1);
        return calls === 1;
      })()`,
    },
    {
      name: "解除後の state 自体は更新され続ける",
      code: `(() => {
        const store = makeStore(0);
        const unsub = store.subscribe(() => {});
        unsub();
        store.setState((prev) => prev + 100);
        return store.getState() === 100;
      })()`,
    },
    {
      name: "getListenerCount は subscribe / 解除に応じて増減する",
      code: `(() => {
        const store = makeStore(0);
        if (store.getListenerCount() !== 0) { return false; }
        const u1 = store.subscribe(() => {});
        const u2 = store.subscribe(() => {});
        if (store.getListenerCount() !== 2) { return false; }
        u1();
        if (store.getListenerCount() !== 1) { return false; }
        u2();
        return store.getListenerCount() === 0;
      })()`,
    },
    {
      name: "同じ listener を 2 回 subscribe しても 1 回だけ通知される (Set による重複排除)",
      code: `(() => {
        const store = makeStore(0);
        let calls = 0;
        const listener = () => { calls += 1; };
        store.subscribe(listener);
        store.subscribe(listener);
        store.setState((prev) => prev + 1);
        return calls === 1 && store.getListenerCount() === 1;
      })()`,
    },
    {
      name: "別々の makeStore 呼び出しで作ったストアは 互いに独立 (state / listener を共有しない)",
      code: `(() => {
        const a = makeStore(1);
        const b = makeStore(100);
        let aCalls = 0;
        let bCalls = 0;
        a.subscribe(() => { aCalls += 1; });
        b.subscribe(() => { bCalls += 1; });
        a.setState((prev) => prev + 1);
        return a.getState() === 2
          && b.getState() === 100
          && aCalls === 1
          && bCalls === 0;
      })()`,
    },
    {
      name: "setState を 0 回呼んでも getState は initialState のまま",
      code: `(() => {
        const store = makeStore("init");
        return store.getState() === "init";
      })()`,
    },
    {
      name: "subscribe 前に setState しても 後から subscribe した listener には過去通知は届かない",
      code: `(() => {
        const store = makeStore(0);
        store.setState((prev) => prev + 1);
        let calls = 0;
        store.subscribe(() => { calls += 1; });
        return calls === 0 && store.getState() === 1;
      })()`,
    },
    {
      name: "返り値の API: getState / setState / subscribe / getListenerCount はすべて関数",
      code: `(() => {
        const store = makeStore(0);
        return typeof store.getState === "function"
          && typeof store.setState === "function"
          && typeof store.subscribe === "function"
          && typeof store.getListenerCount === "function";
      })()`,
    },
  ],
  hints: [
    "外側の function makeStore の本体に let state と const listeners = new Set() を置き、 return { ... } の中で 4 つのアロー関数を並べます。 各アロー関数からは 外側の state と listeners が クロージャで見えます。",
    "setState は (updater) => { ... } の形にして、 中で state = updater(state) → for (const l of listeners) { l(state); } の 2 行だけ書きます。 updater は呼び出し側が書く純粋関数。 ストア側は その戻り値を新しい state にするだけです。",
    "subscribe は listener を Set に add して、 解除関数 () => { listeners.delete(listener); } を return します。 add は Set 自体が重複排除してくれるので、 自分で has チェックは不要です。",
    "解答例:\n```js\nfunction makeStore(initialState) {\n  let state = initialState;\n  const listeners = new Set();\n  return {\n    getState: () => state,\n    setState: (updater) => {\n      state = updater(state);\n      for (const listener of listeners) {\n        listener(state);\n      }\n    },\n    subscribe: (listener) => {\n      listeners.add(listener);\n      return () => {\n        listeners.delete(listener);\n      };\n    },\n    getListenerCount: () => listeners.size,\n  };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function makeStore(initialState) { ... } の宣言形式" },
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数で 4 つの API を作る" },
        { kind: "node", nodeType: "NewExpression", label: "new Set() で listener 集合を作る" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で API オブジェクトや解除関数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function makeStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      for (const listener of listeners) {
        listener(state);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getListenerCount: () => listeners.size,
  };
}
`,
  badSolutions: [
    {
      code: `function makeStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (next) => {
      state = next;
      for (const listener of listeners) {
        listener(state);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getListenerCount: () => listeners.size,
  };
}
`,
      description: "setState を 値 next を取る形にしており、 高階関数として updater を受けていない。 setState((prev) => prev + 1) を呼ぶと state が関数オブジェクトになり、 getState() === 期待値 のテストが失敗する",
    },
    {
      code: `function makeStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      for (const listener of listeners) {
        listener(state);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
    },
    getListenerCount: () => listeners.size,
  };
}
`,
      description: "subscribe が解除関数を返していない。 unsub() を呼ぶと TypeError になり、 「解除すると以降の通知が来ない」 テストが失敗する",
    },
    {
      code: `function makeStore(initialState) {
  let state = initialState;
  const listeners = [];
  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      for (const listener of listeners) {
        listener(state);
      }
    },
    subscribe: (listener) => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) {
          listeners.splice(idx, 1);
        }
      };
    },
    getListenerCount: () => listeners.length,
  };
}
`,
      description: "listener を Set ではなく配列で管理しているため、 new Set() (AST required: NewExpression) が無い違反。 さらに同じ listener を 2 回 subscribe すると 2 回通知される (重複排除テスト失敗)",
    },
    {
      code: `function makeStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getListenerCount: () => listeners.size,
  };
}
`,
      description: "setState が listener に通知していない。 状態は更新されるが subscribe したコードに変更が伝わらず、 通知テストが失敗する",
    },
    {
      code: `function makeStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (updater) => {
      for (const listener of listeners) {
        listener(state);
      }
      state = updater(state);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getListenerCount: () => listeners.size,
  };
}
`,
      description: "通知を 更新前の古い state で行ってしまっている。 listener は新しい state ではなく前の値を見ることになり、 「新しい state を引数で受ける」 テストが失敗する",
    },
  ],
  mdnSections: [
    {
      heading: "クロージャ",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures",
      pageTitle: "クロージャ",
    },
    {
      heading: "Set",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Set",
      pageTitle: "Set",
    },
    {
      heading: "アロー関数式",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Arrow_functions",
      pageTitle: "アロー関数式",
    },
    {
      heading: "高階関数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Glossary/First-class_Function",
      pageTitle: "第一級関数",
    },
  ],
};
