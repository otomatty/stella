/**
 * デモ専用 fixtures (`VITE_SERVER_URL` 未設定 / Tweaks 経路)。
 * 実データ開発 (`isBackendConfigured()`) からは import しないこと。
 */

import type {
  AISuggestion,
  Announcement,
  CompletionByCourse,
  ReviewItem,
  RubricCriterion,
  Stumble,
  User,
} from "@/data/types";

export { TENANTS } from "@/data/seed-catalog";

export const CURRENT_USER: User = {
  name: "田中 翔太",
  email: "tanaka@example.com",
  initials: "TS",
};

export const ANNOUNCEMENTS: Announcement[] = [
  { id: 1, title: "第3期 課題提出期限を5/31まで延長します", date: "4月17日", by: "事務局", unread: true },
  { id: 2, title: "堀江メンターによるライブQ&A (4/22 19:00) 開催予定", date: "4月15日", by: "運営", unread: true },
  { id: 3, title: "【重要】TypeScript 入門研修 教材の更新", date: "4月12日", by: "コース作成", unread: false },
];

export const REVIEW_QUEUE: ReviewItem[] = [
  { id: "r1", student: "田中 翔太", initials: "TS", c: "c1", course: "TypeScript 入門研修", assignment: "変数と型の確認課題", submittedAt: "2時間前", aiReady: true, priority: "high" },
  { id: "r2", student: "佐藤 美咲", initials: "SM", c: "c2", course: "TypeScript 入門研修", assignment: "関数の確認課題", submittedAt: "4時間前", aiReady: true, priority: "normal" },
  { id: "r3", student: "鈴木 健一", initials: "SK", c: "c3", course: "TypeScript 入門研修", assignment: "配列とオブジェクト", submittedAt: "昨日", aiReady: true, priority: "normal" },
  { id: "r4", student: "山田 優花", initials: "YY", c: "c4", course: "TypeScript 入門研修", assignment: "型システムの確認", submittedAt: "昨日", aiReady: false, priority: "normal" },
  { id: "r5", student: "渡辺 拓海", initials: "WT", c: "c5", course: "TypeScript 入門研修", assignment: "非同期処理（再提出）", submittedAt: "2日前", aiReady: true, priority: "high" },
  { id: "r6", student: "中村 理恵", initials: "NR", c: "c6", course: "TypeScript 入門研修", assignment: "実務への接続", submittedAt: "3日前", aiReady: true, priority: "low" },
];

export const SUBMITTED_CODE: string[] = [
  "// ToDo アプリ — 田中 翔太",
  "// script.js",
  "",
  "const todos = []",
  "",
  "function addTodo(text) {",
  '    if(text == "") return;',
  "    todos.push({text: text, done: false})",
  "    render()",
  "}",
  "",
  "function toggleTodo(i) {",
  "    todos[i].done = !todos[i].done",
  "    render()",
  "}",
  "",
  "function deleteTodo(i) {",
  "    todos.splice(i, 1)",
  "    render()",
  "}",
  "",
  "function render() {",
  '    const list = document.getElementById("list")',
  '    list.innerHTML = ""',
  "    for(var i=0; i<todos.length; i++) {",
  '        const li = document.createElement("li")',
  "        li.innerHTML = todos[i].text",
  "        list.appendChild(li)",
  "    }",
  "}",
  "",
  'document.getElementById("add").onclick = function() {',
  '    addTodo(document.getElementById("input").value)',
  "}",
];

export const AI_SUGGESTIONS: AISuggestion[] = [
  {
    id: "s1",
    line: 7,
    severity: "med",
    category: "等価演算子",
    body: "`==` は型変換を伴う緩い比較です。厳密等価 `===` を使用してください。空文字列のチェックは `text.trim() === \"\"` が望ましいです。",
    adopted: null,
  },
  {
    id: "s2",
    line: 22,
    severity: "high",
    category: "XSS脆弱性",
    body: "`innerHTML` にユーザー入力を直接挿入すると XSS の危険があります。`textContent` を使うか、サニタイズ処理を追加してください。",
    adopted: null,
  },
  {
    id: "s3",
    line: 21,
    severity: "low",
    category: "ES2015+",
    body: "`var` ではなく `let` / `const` の使用を推奨します。`for...of` ループの方が読みやすくなります。",
    adopted: null,
  },
  {
    id: "s4",
    line: 4,
    severity: "low",
    category: "状態管理",
    body: "モジュールスコープの配列ではなく、クラスやクロージャで状態をカプセル化すると、今後の拡張性が高まります。",
    adopted: null,
  },
];

export const RUBRIC: RubricCriterion[] = [
  { id: "rb1", name: "機能要件の達成", desc: "追加・完了・削除が動作すること", max: 4, score: 3 },
  { id: "rb2", name: "コード可読性", desc: "命名・コメント・一貫性", max: 4, score: 3 },
  { id: "rb3", name: "保守性・設計", desc: "関数分割・再利用性", max: 4, score: 2 },
  { id: "rb4", name: "セキュリティ配慮", desc: "XSS・入力検証", max: 4, score: 1 },
];

export const ENROLLMENT_TREND: number[] = [
  32, 45, 51, 63, 78, 89, 102, 118, 132, 141, 156, 163,
];

export const COMPLETION_BY_COURSE: CompletionByCourse[] = [
  { name: "TypeScript 入門研修", n: 48, pct: 72 },
];

export const STUMBLES: Stumble[] = [
  { q: "型注釈と型推論", wrong: 68, n: 142 },
  { q: "ユニオン型と narrowing", wrong: 61, n: 142 },
  { q: "ジェネリクスの制約", wrong: 54, n: 138 },
  { q: "Promise と async/await", wrong: 47, n: 105 },
  { q: "unknown と例外処理", wrong: 38, n: 167 },
];
