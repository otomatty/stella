import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch06FindPairSum: Assignment = {
  id: "S4-Ch06-04-find-pair-sum",
  stage: "S4",
  chapterId: "Ch06",
  sequence: 4,
  title: "和が target になるインデックスペアを返す",
  newConcept: "二重ループ + 早期 return で「最初に見つかったペア」を取り出す",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値配列 \`nums\` と目標値 \`target\` を受け取り、 \`nums[i] + nums[j] === target\` (\`i < j\`) を満たす最初のペアのインデックス \`[i, j]\` を返す関数 \`findPairSum\` を実装してください。

- 「最初」とは **\`i\` が小さい順**、 \`i\` が同じなら **\`j\` が小さい順** を指します。
- どのペアも条件を満たさなければ \`null\` を返してください。

\`\`\`js
findPairSum([2, 7, 11, 15], 9);  // → [0, 1]   (2 + 7)
findPairSum([3, 2, 4], 6);       // → [1, 2]   (2 + 4)
findPairSum([1, 2, 3], 100);     // → null
findPairSum([], 0);              // → null
\`\`\`

## ポイント

- **二重ループ** で \`i = 0..n-1\`、 \`j = i + 1..n-1\` を全ペア試します。
- 見つかった瞬間に \`return [i, j]\` で関数ごと抜けるのが早期脱出パターン。 残りのペアはチェック不要です。
- 全部回しても見つからなければ最後に \`return null\`。
`,
  starterFiles: singleFile(`function findPairSum(nums, target) {
  // 二重ループでペアを試し、 見つかったら即 return [i, j]
  // 最後まで見つからなければ null
}
`),
  entryPoints: ["findPairSum"],
  demoCall: `console.log(findPairSum([2, 7, 11, 15], 9));`,
  tests: [
    {
      name: "[2,7,11,15] target=9 は [0,1]",
      code: `JSON.stringify(findPairSum([2, 7, 11, 15], 9)) === JSON.stringify([0, 1])`,
    },
    {
      name: "[3,2,4] target=6 は [1,2]",
      code: `JSON.stringify(findPairSum([3, 2, 4], 6)) === JSON.stringify([1, 2])`,
    },
    {
      name: "見つからなければ null",
      code: `findPairSum([1, 2, 3], 100) === null`,
    },
    {
      name: "空配列なら null",
      code: `findPairSum([], 0) === null`,
    },
    {
      name: "1 要素のみなら null (i < j のペアが作れない)",
      code: `findPairSum([5], 5) === null`,
    },
    {
      name: "複数ペアがある場合は i が小さい方を優先",
      code: `JSON.stringify(findPairSum([1, 2, 3, 4, 5], 6)) === JSON.stringify([0, 4])`,
    },
    {
      name: "同じ値の重複でもインデックスで区別",
      code: `JSON.stringify(findPairSum([3, 3, 3], 6)) === JSON.stringify([0, 1])`,
    },
    {
      name: "負の数を含むペア",
      code: `JSON.stringify(findPairSum([-1, 2, 3], 1)) === JSON.stringify([0, 1])`,
    },
  ],
  hints: [
    "for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) で nums[i] + nums[j] === target なら return [i, j]。 最後に return null。",
    "解答例:\n```js\nfunction findPairSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) {\n        return [i, j];\n      }\n    }\n  }\n  return null;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for 文 (二重ループ) を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果を返す (見つかったら即 return)" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== ではなく === を使う" },
      ],
    },
  },
  solution: `function findPairSum(nums, target) {
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
  badSolutions: [
    {
      code: `function findPairSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return null;
}
`,
      description: "j を 0 から始めているため自分自身とのペア [i, i] や逆順 [j, i] が返ることがある (テスト失敗)",
    },
    {
      code: `function findPairSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
}
`,
      description: "見つからなかったときに null を返していない (undefined が返る → テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "return",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return",
      pageTitle: "return",
    },
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
  ],
};
