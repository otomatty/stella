import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch07RunSteps: Assignment = {
  id: "S5-Ch07-02-run-steps",
  stage: "S5",
  chapterId: "Ch07",
  sequence: 2,
  title: "runSteps: ステップ関数を任意個数受け取り 成功は値を渡して継続 失敗は即時打ち切り",
  newConcept:
    "関数を引数で受ける高階関数の応用。 各ステップは \"成功なら次の値\" / \"失敗なら理由\" を { ok, value } / { ok, error } で返し、 runSteps はそれらを左から繋ぐ 「ミニランナー」 として早期離脱を組み立てる",
  estimatedMinutes: 55,
  difficulty: 2,
  testKind: "function",
  description: `## やること

任意個数のステップ関数 \`...steps\` を受け取り、 「初期値 \`input\` を受けて、 ステップを **左から順に適用** した結果を返す」 関数を返す関数 \`runSteps\` を実装してください。

### ステップ関数の型

各ステップは 「値を受けて結果を返す」 1 引数関数で、 戻り値は以下のいずれか:

- 成功時: \`{ ok: true, value: 次の値 }\`
- 失敗時: \`{ ok: false, error: 理由 }\`

### runSteps の振る舞い

- 各ステップを順に呼び、 \`{ ok: true, value }\` なら **その \`value\` を次のステップの引数として渡す**
- \`{ ok: false }\` が返ってきた時点で **以降のステップを呼ばずに、 その失敗結果をそのまま返す** (早期離脱)
- すべてのステップが成功したら、 最終的な \`{ ok: true, value: 最終値 }\` を返す
- ステップが **0 個** のときは \`{ ok: true, value: input }\` を返す (素通し)

\`\`\`js
const addOne = (n) => ({ ok: true, value: n + 1 });
const double = (n) => ({ ok: true, value: n * 2 });
const failIfNeg = (n) =>
  n < 0 ? { ok: false, error: "negative" } : { ok: true, value: n };

runSteps(addOne, double)(5);                  // → { ok: true, value: 12 }   ((5+1)*2)
runSteps(addOne, failIfNeg, double)(-10);     // → { ok: false, error: "negative" }
runSteps()(42);                               // → { ok: true, value: 42 }

// 失敗ステップの後ろのステップは 呼ばれない
let calls = 0;
const recorded = (n) => { calls += 1; return { ok: true, value: n }; };
runSteps(failIfNeg, recorded, recorded)(-1);  // → { ok: false, error: "negative" }
calls;                                        // → 0
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 S4 卒業課題の \`combineChecks\` (検証の合成) を一般化し、 **値も流す** ミニランナーを書きます。 「値の通り道」 と 「エラーの早期離脱」 を 1 つの形にまとめる練習。
- 推奨フロー:
  1. \`function runSteps(...steps)\` で **残余引数** で関数列を受ける
  2. 内側は \`(input) => { ... }\` のアロー関数を返す
  3. \`let current = input;\` を作って、 \`for...of\` で \`steps\` を 1 つずつ実行
  4. \`step(current)\` の戻り値が \`{ ok: false }\` なら **その \`result\` をそのまま return** (早期離脱)
  5. \`{ ok: true, value }\` なら \`current = result.value\` を更新して次へ
  6. ループを抜けたら最後に \`{ ok: true, value: current }\`
- 「失敗時にエラーメッセージを書き換えて返す」 ような工夫は不要。 ステップから返ってきた **失敗結果をそのまま** 透過することで、 誰がどう失敗したかが呼び出し側に正しく伝わります。
- AST で **\`RestElement\`** (\`...steps\`)、 **\`ArrowFunctionExpression\`** (内側の関数)、 **\`ForOfStatement\`** (\`for...of steps\`)、 **\`ReturnStatement\`** を必須にしています。
`,
  starterFiles: singleFile(`function runSteps() {
  // 残余引数 ...steps で任意個数の関数を受ける。
  //
  // 返すのは アロー関数 (input) => { ... }。
  //   - let current = input から始める
  //   - for...of で steps を 1 件ずつ実行する
  //   - step(current) の戻り値が { ok: false } なら、 そのまま return (早期離脱)
  //   - { ok: true, value } なら current = result.value で更新して次へ
  //   - ループを抜けたら { ok: true, value: current } を返す
}
`),
  entryPoints: ["runSteps"],
  demoCall: `console.log(runSteps((n) => ({ ok: true, value: n + 1 }), (n) => ({ ok: true, value: n * 2 }))(5));`,
  tests: [
    {
      name: "ステップ 1 つ: 値が加工されて返る",
      code: `JSON.stringify(runSteps((n) => ({ ok: true, value: n + 1 }))(5)) === JSON.stringify({ ok: true, value: 6 })`,
    },
    {
      name: "ステップ 2 つを左から順に適用する: ((5+1)*2) = 12",
      code: `JSON.stringify(runSteps(
        (n) => ({ ok: true, value: n + 1 }),
        (n) => ({ ok: true, value: n * 2 }),
      )(5)) === JSON.stringify({ ok: true, value: 12 })`,
    },
    {
      name: "順序が逆だと結果も変わる: ((5*2)+1) = 11",
      code: `JSON.stringify(runSteps(
        (n) => ({ ok: true, value: n * 2 }),
        (n) => ({ ok: true, value: n + 1 }),
      )(5)) === JSON.stringify({ ok: true, value: 11 })`,
    },
    {
      name: "失敗ステップで打ち切る: error がそのまま返る",
      code: `JSON.stringify(runSteps(
        (n) => ({ ok: true, value: n + 1 }),
        (n) => n < 0 ? { ok: false, error: "negative" } : { ok: true, value: n },
        (n) => ({ ok: true, value: n * 100 }),
      )(-10)) === JSON.stringify({ ok: false, error: "negative" })`,
    },
    {
      name: "失敗以降のステップは呼ばれない (早期離脱)",
      code: `(() => {
        let calls = 0;
        const recorded = (n) => { calls += 1; return { ok: true, value: n }; };
        runSteps(
          (n) => ({ ok: false, error: "stop" }),
          recorded,
          recorded,
        )(0);
        return calls === 0;
      })()`,
    },
    {
      name: "ステップ 0 個なら入力を素通しする",
      code: `JSON.stringify(runSteps()(42)) === JSON.stringify({ ok: true, value: 42 })`,
    },
    {
      name: "ステップ 0 個でも入力がオブジェクトなら オブジェクトのまま返す",
      code: `(() => {
        const obj = { foo: 1 };
        const r = runSteps()(obj);
        return r.ok === true && r.value === obj;
      })()`,
    },
    {
      name: "途中のステップの失敗で、 失敗ステップが返した error がそのまま透過する",
      code: `JSON.stringify(runSteps(
        (n) => ({ ok: true, value: n + 1 }),
        (n) => ({ ok: false, error: "specific reason " + n }),
      )(4)) === JSON.stringify({ ok: false, error: "specific reason 5" })`,
    },
    {
      name: "値の型が変わるステップでも通る (number → string)",
      code: `JSON.stringify(runSteps(
        (n) => ({ ok: true, value: n + 1 }),
        (n) => ({ ok: true, value: "n=" + n }),
      )(9)) === JSON.stringify({ ok: true, value: "n=10" })`,
    },
    {
      name: "最初のステップで失敗してもクラッシュせず { ok: false } を返す",
      code: `JSON.stringify(runSteps(
        (n) => ({ ok: false, error: "head" }),
      )(0)) === JSON.stringify({ ok: false, error: "head" })`,
    },
    {
      name: "戻り値は (input) => result の関数",
      code: `typeof runSteps((n) => ({ ok: true, value: n })) === "function"`,
    },
  ],
  hints: [
    "外側の function は 1) ...steps で関数列を受ける 2) (input) => { ... } のアロー関数を return する、 の 2 段構造。 内側で current 変数を更新しながらループを回します。",
    "失敗時の return は result そのものを返すこと。 自前で { ok: false, error: 'something' } と組み立て直すと、 ステップが返した本来の error が消えてしまいます。",
    "「失敗したら break して後段で result を return」 ではなく、 「失敗したらその場で return」 が早期離脱の素直な書き方です。 break + フラグ + 後で組み立て、 は読みづらくなる典型。",
    "解答例:\n```js\nfunction runSteps(...steps) {\n  return (input) => {\n    let current = input;\n    for (const step of steps) {\n      const result = step(current);\n      if (!result.ok) {\n        return result;\n      }\n      current = result.value;\n    }\n    return { ok: true, value: current };\n  };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "RestElement", label: "...steps で任意個数の関数を受ける" },
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数で内側のランナーを作る" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of で steps を 1 つずつ走査する" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果オブジェクトを返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function runSteps(...steps) {
  return (input) => {
    let current = input;
    for (const step of steps) {
      const result = step(current);
      if (!result.ok) {
        return result;
      }
      current = result.value;
    }
    return { ok: true, value: current };
  };
}
`,
  badSolutions: [
    {
      code: `function runSteps(...steps) {
  return (input) => {
    let current = input;
    let failed = null;
    for (const step of steps) {
      const result = step(current);
      if (!result.ok) {
        failed = result;
      } else {
        current = result.value;
      }
    }
    return failed ?? { ok: true, value: current };
  };
}
`,
      description: "失敗しても後ろのステップを呼び続けており、 早期離脱になっていない (calls === 0 テスト失敗)",
    },
    {
      code: `function runSteps(...steps) {
  return (input) => {
    for (const step of steps) {
      const result = step(input);
      if (!result.ok) {
        return result;
      }
    }
    return { ok: true, value: input };
  };
}
`,
      description: "各ステップに毎回 input をそのまま渡してしまっており、 前のステップの value を次へ繋いでいない (チェーンテスト失敗)",
    },
    {
      code: `function runSteps(...steps) {
  return (input) => {
    let current = input;
    for (const step of steps) {
      const result = step(current);
      if (!result.ok) {
        return { ok: false, error: "stop" };
      }
      current = result.value;
    }
    return { ok: true, value: current };
  };
}
`,
      description: "失敗時に固定文字列 'stop' を返してしまい、 ステップが返した本来の error が透過しない (error 透過テスト失敗)",
    },
    {
      code: `function runSteps(steps) {
  return (input) => {
    let current = input;
    for (const step of steps) {
      const result = step(current);
      if (!result.ok) {
        return result;
      }
      current = result.value;
    }
    return { ok: true, value: current };
  };
}
`,
      description: "残余引数を使わず 1 引数で配列として受ける形にしているため、 runSteps(a, b)(x) で b が無視される (AST required: RestElement 違反 + テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "残余引数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/rest_parameters",
      pageTitle: "残余引数",
    },
    {
      heading: "アロー関数式",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Arrow_functions",
      pageTitle: "アロー関数式",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
