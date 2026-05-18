import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch07DecomposeStats: Assignment = {
  id: "S5-Ch07-01-decompose-stats",
  stage: "S5",
  chapterId: "Ch07",
  sequence: 1,
  title: "統計計算を 4 つの純粋関数 (mean / variance / stdDev / summarize) に分割する",
  newConcept:
    "1 つの大きな関数で済ませず、 役割の違う **複数の純粋関数** に切り分けて協調させる。 後段の関数が前段の関数の戻り値を **そのまま再利用** する 「設計分割」 の練習",
  estimatedMinutes: 50,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値配列 \`numbers\` の統計を計算するために、 **役割の違う 4 つの関数** を実装してください。

- \`mean(numbers)\` — 平均値を返す。 空配列なら \`0\`
- \`variance(numbers)\` — 母分散 (各値と平均の差の二乗の平均) を返す。 空配列なら \`0\`。 **内部で \`mean(numbers)\` を呼んで再利用** すること
- \`stdDev(numbers)\` — 標準偏差を返す。 **\`Math.sqrt(variance(numbers))\` を呼ぶだけ** で実装する (二乗和を再計算しない)
- \`summarize(numbers)\` — \`{ count, mean, variance, stdDev }\` を返す。 \`count\` は \`numbers.length\`、 他は **上の 3 関数の呼び出し結果** を入れる

\`\`\`js
mean([1, 2, 3, 4, 5]);        // → 3
variance([1, 2, 3, 4, 5]);    // → 2
stdDev([1, 2, 3, 4, 5]);      // → Math.sqrt(2) ≈ 1.4142...

summarize([2, 4]);
// → { count: 2, mean: 3, variance: 1, stdDev: 1 }

summarize([]);
// → { count: 0, mean: 0, variance: 0, stdDev: 0 }
\`\`\`

### 母分散とは

\`\`\`
variance = (Σ (xᵢ - mean)²) / n
\`\`\`

(標本分散の \`n - 1\` で割る式ではなく、 単純に \`n\` で割る母分散。 空配列のときだけ 0 を返す特殊扱い)

### 純粋関数として扱うこと

どの関数も **引数の配列を書き換えてはいけません**。 たとえば \`numbers.sort()\` で並べ替えると、 呼び出し側の配列が変わってしまい、 「同じ入力で同じ結果」 の不変条件が崩れます。 テストには 「呼び出し前後で input 配列が変わらないこと」 を確かめるケースが含まれます。

## ポイント

- これは S5 (設計演習) の問題です。 「1 つの巨大関数」 を書くのではなく、 **意味の単位で分割された複数の関数** を協調させる練習をします (関数分割 / 純粋関数による設計)。
- \`variance\` は \`mean\` の結果を **再利用** すること。 \`mean\` を内部にコピペすると 「片方を直すと もう片方も直す」 という保守の悪い設計になります。
- 同様に \`stdDev\` は \`variance\` を呼ぶだけ。 一見遠回りでも、 「\`stdDev\` の正しさは \`variance\` の正しさにのみ依存する」 という **責務の階層** が作れます。
- \`summarize\` は **「集約点」** として 3 関数を呼び出して並べるだけ。 自前で平均や分散を計算するべきではありません。
- AST で **\`FunctionDeclaration\`** (\`function 名(...) { ... }\` 形式) と **\`ReturnStatement\`** を必須にし、 **配列を破壊する \`.push\` / \`.sort\` / \`.splice\`** を禁止にしています。
`,
  starterFiles: singleFile(`function mean(numbers) {
  // 平均を返す。 空配列なら 0。
  // ヒント: for...of で合計を取り、 numbers.length で割る。
}

function variance(numbers) {
  // 母分散を返す。 空配列なら 0。
  // mean(numbers) を呼んで再利用する (二度書きしない)。
  // Σ (xᵢ - m)² を numbers.length で割る。
}

function stdDev(numbers) {
  // 標準偏差を返す。 variance(numbers) を Math.sqrt で平方根しただけ。
  // 二乗和を自前で計算し直さないこと。
}

function summarize(numbers) {
  // { count, mean, variance, stdDev } を返す。
  // count は numbers.length。 他 3 つは上の関数を呼ぶ。
}
`),
  entryPoints: ["mean", "variance", "stdDev", "summarize"],
  demoCall: `console.log(summarize([1, 2, 3, 4, 5]));`,
  tests: [
    {
      name: "mean: 整数配列の平均",
      code: `mean([1, 2, 3, 4, 5]) === 3`,
    },
    {
      name: "mean: 空配列なら 0",
      code: `mean([]) === 0`,
    },
    {
      name: "mean: 1 要素ならその値",
      code: `mean([7]) === 7`,
    },
    {
      name: "mean: 負数を含むケース",
      code: `mean([-2, 0, 2]) === 0`,
    },
    {
      name: "variance: [1, 2, 3, 4, 5] は 2",
      code: `Math.abs(variance([1, 2, 3, 4, 5]) - 2) < 1e-9`,
    },
    {
      name: "variance: 全要素が同じなら 0",
      code: `variance([4, 4, 4, 4]) === 0`,
    },
    {
      name: "variance: 空配列なら 0",
      code: `variance([]) === 0`,
    },
    {
      name: "variance: [2, 4] は 1",
      code: `Math.abs(variance([2, 4]) - 1) < 1e-9`,
    },
    {
      name: "stdDev: variance の平方根",
      code: `Math.abs(stdDev([1, 2, 3, 4, 5]) - Math.sqrt(2)) < 1e-9`,
    },
    {
      name: "stdDev: 全要素が同じなら 0",
      code: `stdDev([4, 4, 4, 4]) === 0`,
    },
    {
      name: "stdDev: 空配列なら 0",
      code: `stdDev([]) === 0`,
    },
    {
      name: "summarize: 4 フィールドを揃えて返す",
      code: `(() => {
        const s = summarize([2, 4]);
        return s.count === 2
          && Math.abs(s.mean - 3) < 1e-9
          && Math.abs(s.variance - 1) < 1e-9
          && Math.abs(s.stdDev - 1) < 1e-9;
      })()`,
    },
    {
      name: "summarize: 空配列はすべて 0",
      code: `(() => {
        const s = summarize([]);
        return s.count === 0 && s.mean === 0 && s.variance === 0 && s.stdDev === 0;
      })()`,
    },
    {
      name: "summarize: count は numbers.length と一致する",
      code: `summarize([1, 2, 3, 4, 5]).count === 5`,
    },
    {
      name: "純粋性: mean / variance / stdDev / summarize は入力配列を書き換えない",
      code: `(() => {
        const input = [3, 1, 4, 1, 5, 9, 2, 6];
        const snapshot = JSON.stringify(input);
        mean(input);
        variance(input);
        stdDev(input);
        summarize(input);
        return JSON.stringify(input) === snapshot;
      })()`,
    },
    {
      name: "summarize は同じ入力で何度呼んでも同じ結果 (副作用なし)",
      code: `(() => {
        const a = summarize([1, 2, 3]);
        const b = summarize([1, 2, 3]);
        return JSON.stringify(a) === JSON.stringify(b);
      })()`,
    },
  ],
  hints: [
    "まず mean を書きます。 空配列の特殊扱い → 早期 return 0 → for...of で sum を貯めて numbers.length で割って return、 の 3 行です。",
    "variance では mean(numbers) を 1 回呼んで結果を const m に保存し、 for...of で (n - m) ** 2 を足し合わせます。 自前で平均を再計算しないこと。 mean が更新されれば variance も自動的に正しくなるのが利点です。",
    "stdDev は return Math.sqrt(variance(numbers)) の 1 行で十分です。 二乗和を自前で書き直すと variance と二重実装になり、 設計分割の意義が消えます。",
    "summarize は { count: numbers.length, mean: mean(numbers), variance: variance(numbers), stdDev: stdDev(numbers) } のオブジェクトリテラルでまとめるだけ。 ここで他のロジックを書かないのがコツ。",
    "解答例:\n```js\nfunction mean(numbers) {\n  if (numbers.length === 0) {\n    return 0;\n  }\n  let sum = 0;\n  for (const n of numbers) {\n    sum += n;\n  }\n  return sum / numbers.length;\n}\n\nfunction variance(numbers) {\n  if (numbers.length === 0) {\n    return 0;\n  }\n  const m = mean(numbers);\n  let sumSq = 0;\n  for (const n of numbers) {\n    sumSq += (n - m) ** 2;\n  }\n  return sumSq / numbers.length;\n}\n\nfunction stdDev(numbers) {\n  return Math.sqrt(variance(numbers));\n}\n\nfunction summarize(numbers) {\n  return {\n    count: numbers.length,\n    mean: mean(numbers),\n    variance: variance(numbers),\n    stdDev: stdDev(numbers),\n  };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言で関数を切り分ける" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "push", label: ".push で入力配列を書き換えない (純粋関数の維持)" },
        { kind: "method", name: "sort", label: ".sort で入力配列を書き換えない (in-place mutation)" },
        { kind: "method", name: "splice", label: ".splice で入力配列を書き換えない (in-place mutation)" },
        { kind: "method", name: "reverse", label: ".reverse で入力配列を書き換えない (in-place mutation)" },
      ],
    },
  },
  solution: `function mean(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}

function variance(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  const m = mean(numbers);
  let sumSq = 0;
  for (const n of numbers) {
    sumSq += (n - m) ** 2;
  }
  return sumSq / numbers.length;
}

function stdDev(numbers) {
  return Math.sqrt(variance(numbers));
}

function summarize(numbers) {
  return {
    count: numbers.length,
    mean: mean(numbers),
    variance: variance(numbers),
    stdDev: stdDev(numbers),
  };
}
`,
  badSolutions: [
    {
      code: `function summarize(numbers) {
  if (numbers.length === 0) {
    return { count: 0, mean: 0, variance: 0, stdDev: 0 };
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  const m = sum / numbers.length;
  let sumSq = 0;
  for (const n of numbers) {
    sumSq += (n - m) ** 2;
  }
  const v = sumSq / numbers.length;
  return { count: numbers.length, mean: m, variance: v, stdDev: Math.sqrt(v) };
}
`,
      description: "summarize 1 つで全部やってしまい、 mean / variance / stdDev を別関数として定義していない (テスト失敗: mean などが undefined)",
    },
    {
      code: `function mean(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}

function variance(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  const m = mean(numbers);
  let sumSq = 0;
  for (const n of numbers) {
    sumSq += (n - m) ** 2;
  }
  return sumSq / numbers.length;
}

function stdDev(numbers) {
  return Math.sqrt(variance(numbers));
}

function summarize(numbers) {
  numbers.sort((a, b) => a - b);
  return {
    count: numbers.length,
    mean: mean(numbers),
    variance: variance(numbers),
    stdDev: stdDev(numbers),
  };
}
`,
      description: "summarize の中で numbers.sort を呼んで入力配列を破壊している (AST forbidden + 純粋性テスト失敗)",
    },
    {
      code: `function mean(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}

function variance(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  const m = sum / numbers.length;
  let sumSq = 0;
  for (const n of numbers) {
    sumSq += (n - m) ** 2;
  }
  return sumSq / (numbers.length - 1);
}

function stdDev(numbers) {
  return Math.sqrt(variance(numbers));
}

function summarize(numbers) {
  return {
    count: numbers.length,
    mean: mean(numbers),
    variance: variance(numbers),
    stdDev: stdDev(numbers),
  };
}
`,
      description: "variance を標本分散 (n - 1 で割る) として実装してしまい、 母分散の期待値にならない (テスト失敗)",
    },
    {
      code: `function mean(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}

function variance(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  const m = mean(numbers);
  let sumSq = 0;
  for (const n of numbers) {
    sumSq += (n - m) ** 2;
  }
  return sumSq / numbers.length;
}

function stdDev(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  const m = mean(numbers);
  let sumSq = 0;
  for (const n of numbers) {
    sumSq += (n - m) * (n - m);
  }
  return Math.sqrt(sumSq / numbers.length + 1);
}

function summarize(numbers) {
  return {
    count: numbers.length,
    mean: mean(numbers),
    variance: variance(numbers),
    stdDev: stdDev(numbers),
  };
}
`,
      description: "stdDev を variance に頼らず自前で計算し直した結果、 式に + 1 のバグが入って variance との関係が崩れた (テスト失敗 / 二重実装の典型的事故)",
    },
  ],
  mdnSections: [
    {
      heading: "関数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Functions",
      pageTitle: "関数",
    },
    {
      heading: "純粋関数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Glossary/Pure_function",
      pageTitle: "純粋関数",
    },
    {
      heading: "Math.sqrt()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt",
      pageTitle: "Math.sqrt()",
    },
  ],
};
