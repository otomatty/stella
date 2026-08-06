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

export { COACH_COURSES, SES_COURSES, TENANTS } from "@/data/seed-catalog";

export const CURRENT_USER: User = {
  name: "田中 翔太",
  email: "tanaka@example.com",
  initials: "TS",
};

export const ANNOUNCEMENTS: Announcement[] = [
  { id: 1, title: "第3期 課題提出期限を5/31まで延長します", date: "4月17日", by: "事務局", unread: true },
  { id: 2, title: "堀江メンターによるライブQ&A (4/22 19:00) 開催予定", date: "4月15日", by: "運営", unread: true },
  { id: 3, title: "【重要】JavaScriptセクション 教材 v1.2 への更新", date: "4月12日", by: "コース作成", unread: false },
];

export const REVIEW_QUEUE: ReviewItem[] = [
  { id: "r1", student: "田中 翔太", initials: "TS", c: "c1", course: "Web開発基礎", assignment: "ランディングページ模写", submittedAt: "2時間前", aiReady: true, priority: "high" },
  { id: "r2", student: "佐藤 美咲", initials: "SM", c: "c2", course: "Web開発基礎", assignment: "JS基礎 確認課題", submittedAt: "4時間前", aiReady: true, priority: "normal" },
  { id: "r3", student: "鈴木 健一", initials: "SK", c: "c3", course: "React入門", assignment: "カウンターアプリ実装", submittedAt: "昨日", aiReady: true, priority: "normal" },
  { id: "r4", student: "山田 優花", initials: "YY", c: "c4", course: "基本情報対策", assignment: "アルゴリズム記述問題", submittedAt: "昨日", aiReady: false, priority: "normal" },
  { id: "r5", student: "渡辺 拓海", initials: "WT", c: "c5", course: "Web開発基礎", assignment: "ToDoアプリ（再提出）", submittedAt: "2日前", aiReady: true, priority: "high" },
  { id: "r6", student: "中村 理恵", initials: "NR", c: "c6", course: "Git/GitHub", assignment: "最終確認課題", submittedAt: "3日前", aiReady: true, priority: "low" },
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
  { name: "Web開発基礎", n: 48, pct: 72 },
  { name: "Git / GitHub", n: 52, pct: 94 },
  { name: "React入門", n: 28, pct: 41 },
  { name: "基本情報 対策", n: 35, pct: 18 },
  { name: "Python基礎", n: 22, pct: 63 },
];

export const STUMBLES: Stumble[] = [
  { q: "DOM操作 — イベント伝播とバブリング", wrong: 68, n: 142 },
  { q: "JavaScript — thisの束縛", wrong: 61, n: 142 },
  { q: "CSS — z-index / stacking context", wrong: 54, n: 138 },
  { q: "HTTP — CORSとプリフライト", wrong: 47, n: 105 },
  { q: "Git — rebase vs merge", wrong: 38, n: 167 },
];
