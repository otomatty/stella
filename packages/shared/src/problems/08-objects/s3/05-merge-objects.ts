import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08MergeObjects: Assignment = {
  id: "S3-Ch08-05-merge-objects",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 5,
  title: "2 つのオブジェクトをマージする (後勝ち)",
  newConcept: "スプレッド構文で複数オブジェクトを結合",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

オブジェクト \`a\` と \`b\` を受け取り、 両方のプロパティを持つ新しいオブジェクトを返す関数 \`mergeObjects\` を実装してください。 キーがぶつかったら \`b\` の値で **上書き** します。 元のオブジェクトは変更しません。

\`\`\`js
mergeObjects({ a: 1 }, { b: 2 });         // → { a: 1, b: 2 }
mergeObjects({ a: 1 }, { a: 99 });        // → { a: 99 }    (b 勝ち)
mergeObjects({}, { x: 1, y: 2 });         // → { x: 1, y: 2 }
mergeObjects({ a: 1, b: 2 }, { b: 3 });   // → { a: 1, b: 3 }
\`\`\`

## ポイント

- \`{ ...a, ...b }\` で後に書いた方が優先される。
`,
  starterFiles: singleFile(`function mergeObjects(a, b) {
  // ここを実装してください (a, b は変更しない)
}
`),
  entryPoints: ["mergeObjects"],
  demoCall: `console.log(mergeObjects({ a: 1 }, { b: 2 }));`,
  tests: [
    {
      name: "{a:1} + {b:2} は {a:1, b:2}",
      code: `(() => { const r = mergeObjects({ a: 1 }, { b: 2 }); return r.a === 1 && r.b === 2; })()`,
    },
    {
      name: "{a:1} + {a:99} は {a:99}",
      code: `(() => { const r = mergeObjects({ a: 1 }, { a: 99 }); return r.a === 99; })()`,
    },
    {
      name: "{} + {x:1, y:2} は {x:1, y:2}",
      code: `(() => { const r = mergeObjects({}, { x: 1, y: 2 }); return r.x === 1 && r.y === 2; })()`,
    },
    {
      name: "{a:1, b:2} + {b:3} は {a:1, b:3}",
      code: `(() => { const r = mergeObjects({ a: 1, b: 2 }, { b: 3 }); return r.a === 1 && r.b === 3; })()`,
    },
    {
      name: "元の a, b は変更されず、 戻り値は新しいオブジェクト",
      code: `(() => {
        const a = { x: 1 };
        const b = { y: 2 };
        const beforeA = JSON.stringify(a);
        const beforeB = JSON.stringify(b);
        const r = mergeObjects(a, b);
        return JSON.stringify(a) === beforeA
          && JSON.stringify(b) === beforeB
          && r !== a
          && r !== b;
      })()`,
    },
    {
      name: "重複キーでも元の a, b は変更されず、 b 後勝ち + 新しいオブジェクト",
      code: `(() => {
        const a = { x: 1, z: 3 };
        const b = { x: 2, y: 4 };
        const beforeA = JSON.stringify(a);
        const beforeB = JSON.stringify(b);
        const r = mergeObjects(a, b);
        return JSON.stringify(a) === beforeA
          && JSON.stringify(b) === beforeB
          && r !== a
          && r !== b
          && r.x === 2
          && r.y === 4
          && r.z === 3;
      })()`,
    },
  ],
  hints: [
    "return { ...a, ...b };",
    "解答例:\n```js\nfunction mergeObjects(a, b) {\n  return { ...a, ...b };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return でマージ結果を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function mergeObjects(a, b) {
  return { ...a, ...b };
}
`,
  badSolutions: [
    {
      code: `function mergeObjects(a, b) {
  return { ...b, ...a };
}
`,
      description: "順序が逆 (a 勝ちになっている)",
    },
    {
      code: `function mergeObjects(a, b) {
  Object.assign(a, b);
  return a;
}
`,
      description: "元の a を変更している",
    },
  ],
  mdnSections: [
    {
      heading: "スプレッド構文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      pageTitle: "スプレッド構文",
    },
  ],
};
