import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08PickFields: Assignment = {
  id: "S3-Ch08-07-pick-fields",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 7,
  title: "指定キーのプロパティだけを抜き出す",
  newConcept: "計算済みプロパティ名でオブジェクトを組み立てる",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

オブジェクト \`obj\` とキー名の配列 \`keys\` を受け取り、 \`keys\` に列挙されたキーだけを **持つ新しいオブジェクト** を返す関数 \`pickFields\` を実装してください。 元のオブジェクトに無いキーは無視します。

\`\`\`js
pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"]);
// → { a: 1, c: 3 }

pickFields({ name: "Alice", age: 30, city: "Tokyo" }, ["name", "age"]);
// → { name: "Alice", age: 30 }

pickFields({ a: 1 }, ["a", "missing"]);
// → { a: 1 }

pickFields({ a: 1 }, []);
// → {}
\`\`\`

## ポイント

- 空オブジェクト \`const result = {}\` を作り、 各キーが存在すれば \`result[key] = obj[key]\` で追加します。
- 存在チェックは \`Object.hasOwn(obj, key)\` を使います (継承プロパティは含めない)。
`,
  starterFiles: singleFile(`function pickFields(obj, keys) {
  // ここを実装してください
}
`),
  entryPoints: ["pickFields"],
  demoCall: `console.log(pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"]));`,
  tests: [
    {
      name: '{a:1,b:2,c:3} から ["a","c"] は {a:1, c:3}',
      code: `(() => { const r = pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"]); return r.a === 1 && r.c === 3 && r.b === undefined; })()`,
    },
    {
      name: '{name,age,city} から ["name","age"] は {name,age}',
      code: `(() => { const r = pickFields({ name: "Alice", age: 30, city: "Tokyo" }, ["name", "age"]); return r.name === "Alice" && r.age === 30 && r.city === undefined; })()`,
    },
    {
      name: 'missing キーは無視',
      code: `(() => { const r = pickFields({ a: 1 }, ["a", "missing"]); return r.a === 1 && Object.keys(r).length === 1; })()`,
    },
    {
      name: "空配列の keys なら空オブジェクト",
      code: `(() => { const r = pickFields({ a: 1 }, []); return Object.keys(r).length === 0; })()`,
    },
    {
      name: "継承プロパティは含めない",
      code: `(() => {
        const src = Object.create({ inherited: 1 });
        src.own = 2;
        const r = pickFields(src, ["inherited", "own"]);
        return r.own === 2 && r.inherited === undefined && Object.keys(r).length === 1;
      })()`,
    },
  ],
  hints: [
    "for...of で keys を回し、 存在するなら result[k] = obj[k]。",
    "解答例:\n```js\nfunction pickFields(obj, keys) {\n  const result = {};\n  for (const k of keys) {\n    if (Object.hasOwn(obj, k)) result[k] = obj[k];\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return でオブジェクトを返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function pickFields(obj, keys) {
  const result = {};
  for (const k of keys) {
    if (Object.hasOwn(obj, k)) {
      result[k] = obj[k];
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function pickFields(obj, keys) {
  return obj;
}
`,
      description: "そのまま全部返している",
    },
    {
      code: `function pickFields(obj, keys) {
  const result = {};
  for (const k of keys) {
    result[k] = obj[k];
  }
  return result;
}
`,
      description: "missing キーで undefined を入れてしまっている",
    },
  ],
  mdnSections: [
    {
      heading: "Object.hasOwn()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn",
      pageTitle: "Object.hasOwn()",
    },
  ],
};
