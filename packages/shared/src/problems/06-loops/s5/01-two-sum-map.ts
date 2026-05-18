import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch06TwoSumMap: Assignment = {
  id: "S5-Ch06-01-two-sum-map",
  stage: "S5",
  chapterId: "Ch06",
  sequence: 1,
  title: "和が target になるインデックスペアを Map で 1 周だけ走査して返す",
  newConcept:
    "二重ループ O(n²) を、 「過去に見た値とその index」 を Map に覚えながらの単一周回 O(n) に置き換える、 計算量を意識した設計を体感する",
  estimatedMinutes: 50,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値の配列 \`nums\` と目標値 \`target\` を受け取り、 \`nums[i] + nums[j] === target\` を満たす **最初のインデックス対** \`[i, j]\` (\`i < j\`) を返す関数 \`twoSumMap\` を実装してください。 該当する対が無ければ \`null\` を返します。

- 「最初」 とは、 \`j\` が小さい (= 配列を左から走査して **後ろの要素 j を確定したタイミングが最も早い**) ものを指します
- 入力配列が 1 要素以下のときは \`null\`
- 同じ index を 2 度使うことはできません (\`i !== j\`)

\`\`\`js
twoSumMap([2, 7, 11, 15], 9);   // → [0, 1]   (2 + 7)
twoSumMap([3, 2, 4], 6);        // → [1, 2]   (2 + 4)
twoSumMap([3, 3], 6);           // → [0, 1]
twoSumMap([1, 2, 3], 100);      // → null
twoSumMap([5], 5);              // → null
twoSumMap([], 0);               // → null
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 S4-Ch06-04 (\`find-pair-sum\`) と **同じ問題** ですが、 そこでは \`i\` と \`j\` の **二重ループ O(n²)** で解きました。 ここでは **Map を使って単一周回 O(n)** に最適化する設計を練習します。
- 推奨フロー (1 周だけで答えを出す):
  1. \`seen = new Map()\` を用意 (キー: 値、 値: その index)
  2. \`for (let j = 0; j < nums.length; j++)\` で **右側の要素 j** を確定しながら 1 周
  3. \`need = target - nums[j]\` が \`seen\` に **既にある** なら、 \`[seen.get(need), j]\` を **即 return** する
  4. 無ければ \`seen.set(nums[j], j)\` で「今後の検索のために現在の値と index を記録」
  5. 走査終了まで一度も見つからなければ \`null\`
- \`seen.has(...)\` で「過去に見たか」 を **平均 O(1) で判定** できるのが Map の強み。 これが \`indexOf\` や内側 for ループでの線形探索に比べて **計算量を 1 段下げる** カギです。
- **二重ループでも正解は出ますが、 設計演習の目的を満たさない** ため、 AST で **Map のメソッド呼び出し (\`.set\` / \`.has\` または \`.get\`)** を必須にしています。 内側の for / while を増やす実装は通りません。
`,
  starterFiles: singleFile(`function twoSumMap(nums, target) {
  // 値 → そのインデックス を覚えておく Map を用意する
  // ヒント: const seen = new Map();


  // for で j を 0..nums.length まで 1 周し、 右側の要素を確定していく


  // 必要な相方 need = target - nums[j] が seen に既にあるなら、 [seen.get(need), j] を即 return


  // 無ければ seen に nums[j] -> j を記録して次へ


  // 最後まで見つからなければ null を返す
}
`),
  entryPoints: ["twoSumMap"],
  demoCall: `console.log(twoSumMap([2, 7, 11, 15], 9));`,
  tests: [
    {
      name: "基本ケース: [2, 7, 11, 15] / 9 → [0, 1]",
      code: `JSON.stringify(twoSumMap([2, 7, 11, 15], 9)) === JSON.stringify([0, 1])`,
    },
    {
      name: "中盤に答えがある: [3, 2, 4] / 6 → [1, 2]",
      code: `JSON.stringify(twoSumMap([3, 2, 4], 6)) === JSON.stringify([1, 2])`,
    },
    {
      name: "同じ値のペア: [3, 3] / 6 → [0, 1]",
      code: `JSON.stringify(twoSumMap([3, 3], 6)) === JSON.stringify([0, 1])`,
    },
    {
      name: "解が無いときは null",
      code: `twoSumMap([1, 2, 3], 100) === null`,
    },
    {
      name: "要素が 1 つだけのときは null",
      code: `twoSumMap([5], 5) === null`,
    },
    {
      name: "空配列は null",
      code: `twoSumMap([], 0) === null`,
    },
    {
      name: "負数を含むケース",
      code: `JSON.stringify(twoSumMap([-3, 4, 3, 90], 0)) === JSON.stringify([0, 2])`,
    },
    {
      name: "0 を含むケース",
      code: `JSON.stringify(twoSumMap([0, 4, 3, 0], 0)) === JSON.stringify([0, 3])`,
    },
    {
      name: "j が最小のペアを返す (5+5 のほうが 1+9 や 9+1 より先に確定する)",
      code: `JSON.stringify(twoSumMap([1, 5, 5, 9, 1], 10)) === JSON.stringify([1, 2])`,
    },
    {
      name: "同じ index を 2 度使わない: [5] では null",
      code: `twoSumMap([5], 10) === null`,
    },
    {
      name: "大きな配列でも O(n) で完走する (100000 要素、 末尾に解) — 二重ループ O(n²) はタイムアウトで弾く",
      code: `(() => { const N = 100000; const arr = []; for (let k = 0; k < N - 2; k++) { arr.push(k); } arr.push(1000000); arr.push(1000001); const r = twoSumMap(arr, 2000001); return r[0] === N - 2 && r[1] === N - 1; })()`,
    },
  ],
  hints: [
    "for を 1 周回すあいだ、 「今までに見た値 → その index」 を Map に貯めていきます。 こうすると、 各ステップで 「相方が過去に存在したか」 を seen.has(need) で平均 O(1) で問い合わせられます。",
    "「過去に見た値とその index を覚える」 タイミングは、 必要な相方を確認した **後**。 先に seen.set してしまうと、 同じ index を 2 度使ってしまうケースがあります (例: [3, 3] / 6)。",
    "解答例:\n```js\nfunction twoSumMap(nums, target) {\n  const seen = new Map();\n  for (let j = 0; j < nums.length; j++) {\n    const need = target - nums[j];\n    if (seen.has(need)) {\n      return [seen.get(need), j];\n    }\n    seen.set(nums[j], j);\n  }\n  return null;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "NewExpression", label: "new Map() でデータ構造を用意する" },
        { kind: "method", name: "set", label: "Map.set で 「値 → index」 を記録する" },
        { kind: "method", name: "has", label: "Map.has で過去に見た値かを判定する" },
        { kind: "method", name: "get", label: "Map.get で対応する index を取得する" },
        { kind: "node", nodeType: "ForStatement", label: "for で 1 周だけ走査する" },
        { kind: "node", nodeType: "IfStatement", label: "if で 「相方が見つかった」 を判定する" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で [i, j] または null を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "indexOf", label: "indexOf による線形探索を使わない (計算量が増大し、 Map を使う利点がなくなるため)" },
        { kind: "method", name: "map", label: "S5-Ch06 では .map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S5-Ch06 では .filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "reduce", label: "S5-Ch06 では .reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "sort", label: "S5-Ch06 では .sort を使わない (O(n) の設計を練習するため)" },
      ],
    },
  },
  solution: `function twoSumMap(nums, target) {
  const seen = new Map();
  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];
    if (seen.has(need)) {
      return [seen.get(need), j];
    }
    seen.set(nums[j], j);
  }
  return null;
}
`,
  badSolutions: [
    {
      code: `function twoSumMap(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return null;
}
`,
      description: "S4 と同じ二重ループ O(n²) になっており、 Map を使った O(n) 設計を行っていない (AST required 違反)",
    },
    {
      code: `function twoSumMap(nums, target) {
  const seen = new Map();
  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];
    seen.set(nums[j], j);
    if (seen.has(need)) {
      return [seen.get(need), j];
    }
  }
  return null;
}
`,
      description: "set を has より先に呼んでいるため、 [3, 3] / 6 のように同じ値を 2 度使うべきケースで [0, 0] が出てしまう (テスト失敗)",
    },
    {
      code: `function twoSumMap(nums, target) {
  const seen = new Map();
  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];
    if (seen.has(need)) {
      return [j, seen.get(need)];
    }
    seen.set(nums[j], j);
  }
  return null;
}
`,
      description: "返り値の [i, j] の順序が逆 (大きい index が先) になっており i < j の制約を満たさない (テスト失敗)",
    },
    {
      code: `function twoSumMap(nums, target) {
  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];
    const i = nums.indexOf(need);
    if (i !== -1 && i < j) {
      return [i, j];
    }
  }
  return null;
}
`,
      description: "indexOf を使った線形探索になっており、 Map を全く使っていない (AST required 違反 + forbidden 違反)",
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
      heading: "Map.prototype.has()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map/has",
      pageTitle: "Map.prototype.has()",
    },
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
  ],
};
