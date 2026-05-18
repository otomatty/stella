import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch08TagContactsCapstone: Assignment = {
  id: "S5-Ch08-03-tag-contacts-capstone",
  stage: "S5",
  chapterId: "Ch08",
  sequence: 3,
  title: "[卒業課題] 連絡先帳の state を 純粋関数 4 つで非破壊に操作する",
  newConcept:
    "{ nextId, contacts: [...] } という 1 つの state オブジェクトを、 4 つの純粋関数 (addContact / removeContact / tagContact / findByTag) に流す Redux 風ドメイン。 ネストした配列・タグ配列まで含めて 全階層をスプレッドで非破壊更新する 設計集大成",
  estimatedMinutes: 75,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

これは **Ch08 オブジェクトの S5 卒業課題のひとつ** です。 連絡先帳 (Address Book) のドメインを **4 つの純粋関数** で組み立てます。 関数はすべて 「state を引数で受け、 新しい state を返す」 形 (Redux の reducer に近い)。

### state の形

\`\`\`js
const state = {
  nextId: 1,
  contacts: [
    // { id: 1, name: "Alice", email: "a@example.com", tags: ["friend"] },
    // { id: 2, name: "Bob",   email: "b@example.com", tags: [] },
  ],
};
\`\`\`

呼び出し側は \`{ nextId: 1, contacts: [] }\` で始めることを想定。

### 実装する 4 関数

- \`addContact(state, contact)\` — \`contact = { name, email, tags? }\` を受け取り、 \`state.nextId\` を新しい \`id\` として採番、 \`tags\` は **入力配列をそのまま使わず スプレッドでコピーした新配列** にする (省略時は \`[]\`)、 \`contacts\` の末尾に追加した **新しい state** を返す。 戻り値の \`nextId\` は \`+1\` 進める。 (入力 \`contact.tags\` を後から書き換えても state に波及しないように)
- \`removeContact(state, id)\` — 指定 \`id\` の contact を除外した新しい state を返す。 該当無しのときは contacts の中身は同じ。 \`nextId\` は変えない。 戻り値は **常に元と別インスタンス**。
- \`tagContact(state, id, tag)\` — 指定 \`id\` の contact の \`tags\` 配列に \`tag\` を **重複しないよう** 追加した新しい state を返す。 既に同じ tag があれば contacts は内容変わらず。 戻り値は **常に元と別インスタンス**。 \`nextId\` は変えない。
- \`findByTag(state, tag)\` — 指定 \`tag\` を **\`tags\` 配列に含む** contact だけを集めた **配列** を返す (state は変えない)。 該当無しなら空配列。

\`\`\`js
let s = { nextId: 1, contacts: [] };
s = addContact(s, { name: "Alice", email: "a@x.com" });
// s = { nextId: 2, contacts: [{ id: 1, name: "Alice", email: "a@x.com", tags: [] }] }

s = addContact(s, { name: "Bob", email: "b@x.com", tags: ["work"] });
// s = { nextId: 3, contacts: [..., { id: 2, name: "Bob", ..., tags: ["work"] }] }

s = tagContact(s, 1, "friend");
// s.contacts[0].tags === ["friend"]

s = tagContact(s, 1, "friend");
// 既に "friend" があるので tags は ["friend"] のまま

findByTag(s, "work");
// → [{ id: 2, name: "Bob", ... }]

s = removeContact(s, 1);
// s.contacts は Bob だけになる
\`\`\`

### 守るべき制約

- **元の state を破壊しない**。 state レベル / contacts 配列レベル / 該当 contact レベル / tags 配列レベル の 4 階層、 すべて **スプレッドで新オブジェクト・新配列** を作る。
- 影響を受けない contact (id が違う) は **元の参照のまま** 新しい contacts 配列に入れる (構造共有)。
- \`map\` / \`filter\` / \`reduce\` は使わない (Ch09 で導入予定)。 \`splice\` / \`sort\` / \`reverse\` も使わない (元配列を破壊するため)。
- 4 関数すべて \`function\` 宣言で書く。

## ポイント

- これは S5 卒業課題です。 S5 全体のテーマ — 「**役割の異なる純粋関数を協調させる**」 「**ネストしたオブジェクトの非破壊更新**」 「**主従関係 (id) の解決**」 「**設計判断を伴う関数分割**」 — を 1 ドメインにまとめた統合演習。
- 推奨フロー (関数ごと):
  - **addContact**: \`const id = state.nextId; const newContact = { ...contact, id, tags: [...(contact.tags ?? [])] }; return { ...state, nextId: id + 1, contacts: [...state.contacts, newContact] };\`
  - **removeContact**: \`const newContacts = []; for...of で id 違いだけ push; return { ...state, contacts: newContacts };\`
  - **tagContact**: \`const newContacts = []; for...of で 該当 id 以外はそのまま push。 該当 id は c.tags.includes(tag) ならそのまま push、 そうでなければ { ...c, tags: [...c.tags, tag] } を push。 最後に { ...state, contacts: newContacts } を return。\`
  - **findByTag**: \`const result = []; for...of で contact.tags.includes(tag) を満たすものだけ push。 result を return。 state は触らない。\`
- \`tags ?? []\` のように **Nullish 合体演算子** で省略時のデフォルトを書ける (S2 で導入済みの「短く書く」 技法)。
- 「該当 id が無くても 新しい state を返す」 のは、 この課題で更新関数の返却規約を単純化するため。 Redux/React の reducer 慣行では 「未変更なら元の参照を返して === で変化検知させる」 のが一般的だが、 ここでは学習のブレを無くす目的で あえて 「変更があってもなくても常に新インスタンス」 に統一する。
- **影響を受けない contact は元の参照のまま** 入れること。 全件を \`{ ...c }\` で複製してしまうと、 React 等で 「全部変わった」 と誤検知されて再レンダリングが起きる。 これも設計判断。
`,
  starterFiles: singleFile(`function addContact(state, contact) {
  // 1) const id = state.nextId; を採番する。
  // 2) const newContact = { ...contact, id, tags: [...(contact.tags ?? [])] };
  // 3) return { ...state, nextId: id + 1, contacts: [...state.contacts, newContact] };
}

function removeContact(state, id) {
  // 1) 空配列 newContacts を用意し、
  // 2) for...of で state.contacts を 1 周し、 c.id !== id のものだけ push する。
  // 3) return { ...state, contacts: newContacts };
}

function tagContact(state, id, tag) {
  // 1) 空配列 newContacts を用意し、
  // 2) for...of で state.contacts を 1 周する。
  //    - c.id !== id のとき: そのまま push (構造共有)。
  //    - c.id === id かつ c.tags.includes(tag) のとき: そのまま push (重複させない)。
  //    - c.id === id かつ tag が未追加のとき: { ...c, tags: [...c.tags, tag] } を push。
  // 3) return { ...state, contacts: newContacts };
}

function findByTag(state, tag) {
  // 1) 空配列 result を用意し、
  // 2) for...of で state.contacts を 1 周し、 c.tags.includes(tag) なら push する。
  // 3) result を return する (state は触らない)。
}
`),
  entryPoints: ["addContact", "removeContact", "tagContact", "findByTag"],
  demoCall: `(() => {
  let s = { nextId: 1, contacts: [] };
  s = addContact(s, { name: "Alice", email: "a@x.com" });
  s = tagContact(s, 1, "friend");
  console.log(JSON.stringify(s));
  console.log(JSON.stringify(findByTag(s, "friend")));
})();`,
  tests: [
    {
      name: "addContact: nextId を id として採番し、 contacts 末尾に追加する",
      code: `(() => {
        const s0 = { nextId: 1, contacts: [] };
        const s1 = addContact(s0, { name: "Alice", email: "a@x.com" });
        return s1.nextId === 2
          && s1.contacts.length === 1
          && s1.contacts[0].id === 1
          && s1.contacts[0].name === "Alice"
          && s1.contacts[0].email === "a@x.com";
      })()`,
    },
    {
      name: "addContact: tags 省略時は 空配列 [] を補う",
      code: `(() => {
        const s0 = { nextId: 1, contacts: [] };
        const s1 = addContact(s0, { name: "A", email: "a@x.com" });
        return Array.isArray(s1.contacts[0].tags) && s1.contacts[0].tags.length === 0;
      })()`,
    },
    {
      name: "addContact: 連続呼び出しで id が 1, 2, 3 と進む",
      code: `(() => {
        let s = { nextId: 1, contacts: [] };
        s = addContact(s, { name: "A", email: "a" });
        s = addContact(s, { name: "B", email: "b" });
        s = addContact(s, { name: "C", email: "c" });
        return s.nextId === 4
          && s.contacts.length === 3
          && s.contacts[0].id === 1
          && s.contacts[1].id === 2
          && s.contacts[2].id === 3;
      })()`,
    },
    {
      name: "addContact: 元の state を破壊しない",
      code: `(() => {
        const s0 = { nextId: 1, contacts: [] };
        const before = JSON.stringify(s0);
        addContact(s0, { name: "A", email: "a" });
        return JSON.stringify(s0) === before && s0.contacts.length === 0;
      })()`,
    },
    {
      name: "addContact: 渡された contact オブジェクトに id / tags を 直接生やさない",
      code: `(() => {
        const input = { name: "A", email: "a" };
        addContact({ nextId: 1, contacts: [] }, input);
        return !Object.hasOwn(input, "id") && !Object.hasOwn(input, "tags");
      })()`,
    },
    {
      name: "addContact: 入力 contact.tags 配列を そのまま参照共有しない (後から push されても state に波及しない)",
      code: `(() => {
        const tags = ["work"];
        const input = { name: "A", email: "a@x.com", tags };
        const s1 = addContact({ nextId: 1, contacts: [] }, input);
        tags.push("later");
        return s1.contacts[0].tags.length === 1
          && s1.contacts[0].tags[0] === "work"
          && s1.contacts[0].tags !== tags;
      })()`,
    },
    {
      name: "removeContact: 該当 id を除外する",
      code: `(() => {
        const s0 = { nextId: 3, contacts: [
          { id: 1, name: "A", email: "a", tags: [] },
          { id: 2, name: "B", email: "b", tags: [] },
        ] };
        const s1 = removeContact(s0, 1);
        return s1.contacts.length === 1 && s1.contacts[0].id === 2;
      })()`,
    },
    {
      name: "removeContact: nextId は変えない",
      code: `(() => {
        const s0 = { nextId: 5, contacts: [{ id: 1, name: "A", email: "a", tags: [] }] };
        const s1 = removeContact(s0, 1);
        return s1.nextId === 5;
      })()`,
    },
    {
      name: "removeContact: 該当 id が無くても 新しい state インスタンスを返す",
      code: `(() => {
        const s0 = { nextId: 3, contacts: [{ id: 1, name: "A", email: "a", tags: [] }] };
        const s1 = removeContact(s0, 999);
        return s1 !== s0
          && s1.contacts !== s0.contacts
          && s1.contacts.length === 1
          && s1.contacts[0].id === 1;
      })()`,
    },
    {
      name: "removeContact: 元の state を破壊しない",
      code: `(() => {
        const s0 = { nextId: 3, contacts: [
          { id: 1, name: "A", email: "a", tags: [] },
          { id: 2, name: "B", email: "b", tags: [] },
        ] };
        const before = JSON.stringify(s0);
        removeContact(s0, 1);
        return JSON.stringify(s0) === before && s0.contacts.length === 2;
      })()`,
    },
    {
      name: "tagContact: 指定 contact の tags に tag を追加した 新しい contact が入る",
      code: `(() => {
        const s0 = { nextId: 2, contacts: [{ id: 1, name: "A", email: "a", tags: [] }] };
        const s1 = tagContact(s0, 1, "friend");
        return s1.contacts[0].tags.length === 1 && s1.contacts[0].tags[0] === "friend";
      })()`,
    },
    {
      name: "tagContact: 既存の tags を 上書きせず 末尾に追加する",
      code: `(() => {
        const s0 = { nextId: 2, contacts: [{ id: 1, name: "A", email: "a", tags: ["work"] }] };
        const s1 = tagContact(s0, 1, "friend");
        return s1.contacts[0].tags.length === 2
          && s1.contacts[0].tags[0] === "work"
          && s1.contacts[0].tags[1] === "friend";
      })()`,
    },
    {
      name: "tagContact: 同じ tag を 2 回追加しても 1 つだけ (重複排除) かつ 重複時でも新しい state インスタンスを返す",
      code: `(() => {
        const s0 = { nextId: 2, contacts: [{ id: 1, name: "A", email: "a", tags: ["friend"] }] };
        const s1 = tagContact(s0, 1, "friend");
        return s1 !== s0
          && s1.contacts !== s0.contacts
          && s1.contacts[0] === s0.contacts[0]
          && s1.contacts[0].tags.length === 1
          && s1.contacts[0].tags[0] === "friend";
      })()`,
    },
    {
      name: "tagContact: 該当 contact は 元と別オブジェクト (新しい tags 配列を持つ)",
      code: `(() => {
        const original = { id: 1, name: "A", email: "a", tags: [] };
        const s0 = { nextId: 2, contacts: [original] };
        const s1 = tagContact(s0, 1, "friend");
        return s1.contacts[0] !== original && s1.contacts[0].tags !== original.tags;
      })()`,
    },
    {
      name: "tagContact: 影響を受けない contact は 元の参照のまま (構造共有)",
      code: `(() => {
        const a = { id: 1, name: "A", email: "a", tags: [] };
        const b = { id: 2, name: "B", email: "b", tags: [] };
        const s0 = { nextId: 3, contacts: [a, b] };
        const s1 = tagContact(s0, 1, "friend");
        return s1.contacts[1] === b;
      })()`,
    },
    {
      name: "tagContact: 該当 id が無くても 新しい state インスタンスを返す",
      code: `(() => {
        const s0 = { nextId: 2, contacts: [{ id: 1, name: "A", email: "a", tags: [] }] };
        const s1 = tagContact(s0, 999, "friend");
        return s1 !== s0
          && s1.contacts !== s0.contacts
          && s1.contacts.length === 1
          && s1.contacts[0].tags.length === 0;
      })()`,
    },
    {
      name: "tagContact: 元の state / contact / tags 配列 を破壊しない",
      code: `(() => {
        const tags = [];
        const c = { id: 1, name: "A", email: "a", tags };
        const s0 = { nextId: 2, contacts: [c] };
        tagContact(s0, 1, "friend");
        return tags.length === 0 && c.tags === tags && s0.contacts[0] === c;
      })()`,
    },
    {
      name: "findByTag: 指定 tag を 含む contact だけを 配列で返す",
      code: `(() => {
        const s0 = { nextId: 4, contacts: [
          { id: 1, name: "A", email: "a", tags: ["friend"] },
          { id: 2, name: "B", email: "b", tags: ["work"] },
          { id: 3, name: "C", email: "c", tags: ["friend", "work"] },
        ] };
        const r = findByTag(s0, "friend");
        return Array.isArray(r) && r.length === 2 && r[0].id === 1 && r[1].id === 3;
      })()`,
    },
    {
      name: "findByTag: 該当 0 件なら空配列",
      code: `(() => {
        const s0 = { nextId: 2, contacts: [{ id: 1, name: "A", email: "a", tags: [] }] };
        const r = findByTag(s0, "nope");
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "findByTag: state は変えない",
      code: `(() => {
        const s0 = { nextId: 2, contacts: [{ id: 1, name: "A", email: "a", tags: ["friend"] }] };
        const before = JSON.stringify(s0);
        findByTag(s0, "friend");
        return JSON.stringify(s0) === before;
      })()`,
    },
    {
      name: "4 関数を組み合わせた連続シナリオ",
      code: `(() => {
        let s = { nextId: 1, contacts: [] };
        s = addContact(s, { name: "Alice", email: "a@x.com" });
        s = addContact(s, { name: "Bob",   email: "b@x.com", tags: ["work"] });
        s = addContact(s, { name: "Carol", email: "c@x.com" });
        s = tagContact(s, 1, "friend");
        s = tagContact(s, 3, "friend");
        s = tagContact(s, 1, "friend");
        const friends = findByTag(s, "friend");
        s = removeContact(s, 2);
        return s.nextId === 4
          && s.contacts.length === 2
          && s.contacts[0].id === 1 && s.contacts[0].tags.length === 1
          && s.contacts[1].id === 3 && s.contacts[1].tags.length === 1
          && friends.length === 2
          && friends[0].id === 1 && friends[1].id === 3;
      })()`,
    },
  ],
  hints: [
    "4 関数とも 「state を読み、 新しい state を返す」 純粋関数として書きます。 state そのものを書き換えたり、 contacts 配列を push で増やしたり、 contact の tags を直接 push で増やしたりはしません。",
    "addContact は 一番シンプルです。 const id = state.nextId; を採番し、 newContact = { ...contact, id, tags: [...(contact.tags ?? [])] }; を作って、 contacts: [...state.contacts, newContact] と nextId: id + 1 を持つ新しい state を返すだけ。",
    "tagContact は 2 段階のスプレッドが必要です。 1) 該当 contact を { ...c, tags: [...c.tags, tag] } で新オブジェクトに置き換え、 2) その新オブジェクトを含む newContacts 配列を作り、 3) { ...state, contacts: newContacts } を返します。 includes(tag) が true なら 2 段スプレッドはせず 元の c をそのまま push して構造共有します。",
    "解答例:\n```js\nfunction addContact(state, contact) {\n  const id = state.nextId;\n  const newContact = { ...contact, id, tags: [...(contact.tags ?? [])] };\n  return {\n    ...state,\n    nextId: id + 1,\n    contacts: [...state.contacts, newContact],\n  };\n}\n\nfunction removeContact(state, id) {\n  const newContacts = [];\n  for (const c of state.contacts) {\n    if (c.id !== id) {\n      newContacts.push(c);\n    }\n  }\n  return { ...state, contacts: newContacts };\n}\n\nfunction tagContact(state, id, tag) {\n  const newContacts = [];\n  for (const c of state.contacts) {\n    if (c.id !== id || c.tags.includes(tag)) {\n      newContacts.push(c);\n    } else {\n      newContacts.push({ ...c, tags: [...c.tags, tag] });\n    }\n  }\n  return { ...state, contacts: newContacts };\n}\n\nfunction findByTag(state, tag) {\n  const result = [];\n  for (const c of state.contacts) {\n    if (c.tags.includes(tag)) {\n      result.push(c);\n    }\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "4 関数 (addContact / removeContact / tagContact / findByTag) を function 宣言で書く" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果を返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of で contacts を走査する" },
        { kind: "node", nodeType: "IfStatement", label: "if で 該当 id か / tag を既に持つか を判定する" },
        { kind: "node", nodeType: "SpreadElement", label: "{ ...state, ... } / { ...c, tags: [...c.tags, tag] } で 全階層を非破壊更新する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "map", label: "S5-Ch08 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S5-Ch08 では filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "reduce", label: "S5-Ch08 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "splice", label: "splice は元配列を破壊するので使わない" },
        { kind: "method", name: "sort", label: "sort は元配列を破壊するので使わない" },
        { kind: "method", name: "reverse", label: "reverse は元配列を破壊するので使わない" },
      ],
    },
  },
  solution: `function addContact(state, contact) {
  const id = state.nextId;
  const newContact = { ...contact, id, tags: [...(contact.tags ?? [])] };
  return {
    ...state,
    nextId: id + 1,
    contacts: [...state.contacts, newContact],
  };
}

function removeContact(state, id) {
  const newContacts = [];
  for (const c of state.contacts) {
    if (c.id !== id) {
      newContacts.push(c);
    }
  }
  return { ...state, contacts: newContacts };
}

function tagContact(state, id, tag) {
  const newContacts = [];
  for (const c of state.contacts) {
    if (c.id !== id || c.tags.includes(tag)) {
      newContacts.push(c);
    } else {
      newContacts.push({ ...c, tags: [...c.tags, tag] });
    }
  }
  return { ...state, contacts: newContacts };
}

function findByTag(state, tag) {
  const result = [];
  for (const c of state.contacts) {
    if (c.tags.includes(tag)) {
      result.push(c);
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function addContact(state, contact) {
  contact.id = state.nextId;
  contact.tags = contact.tags ?? [];
  state.contacts.push(contact);
  state.nextId += 1;
  return state;
}

function removeContact(state, id) {
  for (let i = 0; i < state.contacts.length; i++) {
    if (state.contacts[i].id === id) {
      state.contacts.splice(i, 1);
      break;
    }
  }
  return state;
}

function tagContact(state, id, tag) {
  for (const c of state.contacts) {
    if (c.id === id && !c.tags.includes(tag)) {
      c.tags.push(tag);
    }
  }
  return state;
}

function findByTag(state, tag) {
  const result = [];
  for (const c of state.contacts) {
    if (c.tags.includes(tag)) {
      result.push(c);
    }
  }
  return result;
}
`,
      description: "全関数で元の state / contacts / contact / tags をミューテーションしている (非破壊テスト失敗 + splice 使用で AST forbidden 違反 + SpreadElement が無くて AST required 違反)",
    },
    {
      code: `function addContact(state, contact) {
  const id = state.nextId;
  return {
    ...state,
    nextId: id + 1,
    contacts: [...state.contacts, { ...contact, id, tags: [...(contact.tags ?? [])] }],
  };
}

function removeContact(state, id) {
  return { ...state, contacts: state.contacts.filter((c) => c.id !== id) };
}

function tagContact(state, id, tag) {
  return {
    ...state,
    contacts: state.contacts.map((c) =>
      c.id === id && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c,
    ),
  };
}

function findByTag(state, tag) {
  return state.contacts.filter((c) => c.tags.includes(tag));
}
`,
      description: "filter / map を使っている (AST forbidden 違反) — Ch09 で導入予定の配列メソッドを先取りしすぎ",
    },
    {
      code: `function addContact(state, contact) {
  const id = state.nextId;
  const newContact = { ...contact, id, tags: [...(contact.tags ?? [])] };
  return {
    ...state,
    nextId: id + 1,
    contacts: [...state.contacts, newContact],
  };
}

function removeContact(state, id) {
  const newContacts = [];
  for (const c of state.contacts) {
    if (c.id !== id) {
      newContacts.push(c);
    }
  }
  return { ...state, contacts: newContacts };
}

function tagContact(state, id, tag) {
  const newContacts = [];
  for (const c of state.contacts) {
    if (c.id !== id) {
      newContacts.push(c);
    } else {
      newContacts.push({ ...c, tags: [...c.tags, tag] });
    }
  }
  return { ...state, contacts: newContacts };
}

function findByTag(state, tag) {
  const result = [];
  for (const c of state.contacts) {
    if (c.tags.includes(tag)) {
      result.push(c);
    }
  }
  return result;
}
`,
      description: "tagContact が tag の重複チェック (includes) を省いており、 同じ tag を 2 回追加するテストで tags が ['friend', 'friend'] になって失敗する",
    },
    {
      code: `function addContact(state, contact) {
  const id = state.nextId;
  const newContact = { ...contact, id, tags: [...(contact.tags ?? [])] };
  return {
    ...state,
    nextId: id + 1,
    contacts: [...state.contacts, newContact],
  };
}

function removeContact(state, id) {
  const newContacts = [];
  for (const c of state.contacts) {
    if (c.id !== id) {
      newContacts.push({ ...c });
    }
  }
  return { ...state, contacts: newContacts };
}

function tagContact(state, id, tag) {
  const newContacts = [];
  for (const c of state.contacts) {
    if (c.id !== id || c.tags.includes(tag)) {
      newContacts.push({ ...c });
    } else {
      newContacts.push({ ...c, tags: [...c.tags, tag] });
    }
  }
  return { ...state, contacts: newContacts };
}

function findByTag(state, tag) {
  const result = [];
  for (const c of state.contacts) {
    if (c.tags.includes(tag)) {
      result.push(c);
    }
  }
  return result;
}
`,
      description: "影響を受けない contact まで { ...c } で 新オブジェクトに作り変えている。 「構造共有」 テスト (s1.contacts[1] === b) が失敗する",
    },
    {
      code: `function addContact(state, contact) {
  const id = state.nextId;
  const newContact = { ...contact, id, tags: [...(contact.tags ?? [])] };
  return {
    ...state,
    nextId: id + 1,
    contacts: [...state.contacts, newContact],
  };
}

function removeContact(state, id) {
  const newContacts = [];
  let found = false;
  for (const c of state.contacts) {
    if (c.id !== id) {
      newContacts.push(c);
    } else {
      found = true;
    }
  }
  if (!found) {
    return state;
  }
  return { ...state, contacts: newContacts };
}

function tagContact(state, id, tag) {
  const newContacts = [];
  for (const c of state.contacts) {
    if (c.id !== id || c.tags.includes(tag)) {
      newContacts.push(c);
    } else {
      newContacts.push({ ...c, tags: [...c.tags, tag] });
    }
  }
  return { ...state, contacts: newContacts };
}

function findByTag(state, tag) {
  const result = [];
  for (const c of state.contacts) {
    if (c.tags.includes(tag)) {
      result.push(c);
    }
  }
  return result;
}
`,
      description: "removeContact が 該当 id 無しのときに return state して 元のインスタンスを返している。 「該当無しでも別インスタンス」 テスト (s1 !== s0) が失敗する",
    },
  ],
  mdnSections: [
    {
      heading: "スプレッド構文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      pageTitle: "スプレッド構文",
    },
    {
      heading: "Nullish 合体演算子 (??)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing",
      pageTitle: "Null 合体演算子",
    },
    {
      heading: "Array.prototype.includes",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/includes",
      pageTitle: "Array.prototype.includes",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
