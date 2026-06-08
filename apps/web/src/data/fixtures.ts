import type {
  AISuggestion,
  Announcement,
  CompletionByCourse,
  Course,
  ReviewItem,
  RubricCriterion,
  Stumble,
  Tenant,
  User,
} from './types';

export const TENANTS: Tenant[] = [
  { id: 'coach', name: '部活動指導者', subtitle: '地域スポーツ指導者講習', icon: 'school', active: 132 },
  { id: 'ses', name: 'SES未経験エンジニア育成', subtitle: 'エンジニア研修 / 資格対策', icon: 'cpu', active: 87 },
];

export const CURRENT_USER: User = {
  name: '田中 翔太',
  email: 'tanaka@example.com',
  initials: 'TS',
};

export const SES_COURSES: Course[] = [
  {
    id: 'web-fundamentals',
    title: 'Web開発基礎 — HTML / CSS / JavaScript',
    category: 'フロントエンド',
    color: 'indigo',
    duration: 28,
    lessonsCount: 29,
    progress: 62,
    enrolledBy: '堀江メンター',
    dueAt: '2026-05-31',
    description:
      '未経験者が3週間で実務レベルのHTML/CSS/JS基礎を身につけるためのコース。ハンズオン中心で、最終課題として簡易ToDoアプリを提出する。',
    sections: [
      {
        id: 's1',
        title: '01. Webの仕組み',
        lessons: [
          {
            id: 'l1',
            title: 'HTTPとクライアント/サーバー',
            type: 'slides',
            duration: '12分',
            status: 'done',
            pdfPath: 'web-fundamentals/01-http.pdf',
            totalPages: 18,
          },
          {
            id: 'l2',
            title: 'DNS・URL・ブラウザレンダリング',
            type: 'video',
            duration: '09:20',
            status: 'done',
            videoPath: 'web-fundamentals/02-dns.mp4',
            totalSec: 560,
          },
          { id: 'l3', title: '確認テスト（全10問）', type: 'quiz', duration: '10分', status: 'done' },
        ],
      },
      {
        id: 's2',
        title: '02. HTML / CSS',
        lessons: [
          { id: 'l4', title: 'セマンティックHTML', type: 'video', duration: '15:10', status: 'done' },
          { id: 'l5', title: 'Flexbox と Grid', type: 'video', duration: '18:30', status: 'done' },
          { id: 'l6', title: 'レスポンシブデザイン', type: 'text', duration: '8分', status: 'done' },
          { id: 'l7', title: '課題: ランディングページ模写', type: 'assignment', duration: '提出', status: 'done' },
        ],
      },
      {
        id: 's3',
        title: '03. JavaScript 基礎',
        lessons: [
          { id: 'l8', title: '変数・型・制御構文', type: 'video', duration: '22:00', status: 'done' },
          { id: 'l9', title: '配列・オブジェクト', type: 'video', duration: '17:45', status: 'done' },
          {
            id: 'l10',
            title: '関数とスコープ',
            type: 'video',
            duration: '19:30',
            status: 'active',
            progress: 42,
            videoPath: 'web-fundamentals/10-functions.mp4',
            totalSec: 1170,
          },
          {
            id: 'l11a',
            title: '【演習】hello を出力',
            type: 'code',
            duration: '5分',
            status: 'todo',
            assignmentId: 'S0-Ch00-01-print-hello',
          },
          {
            id: 'l11b',
            title: '【演習】変数の表示',
            type: 'code',
            duration: '5分',
            status: 'todo',
            assignmentId: 'S0-Ch00-06-print-variable',
          },
          { id: 'l11', title: 'DOM操作入門', type: 'video', duration: '16:20', status: 'todo' },
          { id: 'l12', title: '非同期処理（Promise / async）', type: 'text', duration: '12分', status: 'todo' },
          { id: 'l13', title: '中間クイズ', type: 'quiz', duration: '15分', status: 'todo' },
        ],
      },
      {
        id: 's4',
        title: '04. 実習課題',
        lessons: [
          { id: 'l14', title: 'ToDoアプリ設計書', type: 'text', duration: '10分', status: 'locked' },
          {
            id: 'l15',
            title: 'Web IDE: マルチファイル演習',
            type: 'code',
            duration: '提出',
            status: 'todo',
            assignmentId: 'S0-Ch00-08-multifile-demo',
          },
          { id: 'l16', title: '最終課題レビュー', type: 'assignment', duration: '提出', status: 'locked' },
        ],
      },
      {
        id: 's5',
        title: '05. データベース入門 (SQL)',
        lessons: [
          {
            id: 'l17',
            title: 'SELECT 文の基礎',
            type: 'code',
            duration: '5分',
            status: 'todo',
            assignmentId: 'S0-Sql-Ch00-01-select-hello',
          },
          {
            id: 'l18',
            title: 'WHERE 句で絞り込み',
            type: 'code',
            duration: '7分',
            status: 'todo',
            assignmentId: 'S0-Sql-Ch00-02-where-filter',
          },
          {
            id: 'l19',
            title: 'GROUP BY で集計',
            type: 'code',
            duration: '10分',
            status: 'todo',
            assignmentId: 'S0-Sql-Ch00-03-group-by',
          },
        ],
      },
    ],
  },
  {
    id: 'git-basics',
    title: 'Git / GitHub 実務ワークフロー',
    category: 'ツール',
    color: 'slate',
    duration: 8,
    lessonsCount: 10,
    progress: 100,
    dueAt: '2026-04-10',
    description: '実務で通用するブランチ戦略とPRレビューを学ぶ。',
    completed: true,
  },
  {
    id: 'ciso-basic',
    title: '情報処理技術者試験 基本情報 — 対策講座',
    category: '資格対策',
    color: 'green',
    duration: 40,
    lessonsCount: 36,
    progress: 18,
    dueAt: '2026-06-20',
  },
  {
    id: 'react-intro',
    title: 'React入門 — コンポーネント設計からフック活用まで',
    category: 'フロントエンド',
    color: 'amber',
    duration: 22,
    lessonsCount: 19,
    progress: 0,
    dueAt: null,
  },
];

export const COACH_COURSES: Course[] = [
  {
    id: 'safety-1',
    title: '地域スポーツ指導者 安全管理研修',
    category: '必修',
    color: 'indigo',
    lessonsCount: 12,
    progress: 78,
    dueAt: '2026-05-20',
  },
  {
    id: 'comm-1',
    title: '子どもとのコミュニケーション実技',
    category: '必修',
    color: 'green',
    lessonsCount: 8,
    progress: 45,
  },
  {
    id: 'first-aid',
    title: '応急処置 / 救命講習',
    category: '必修',
    color: 'amber',
    lessonsCount: 6,
    progress: 100,
    completed: true,
  },
];

export const ANNOUNCEMENTS: Announcement[] = [
  { id: 1, title: '第3期 課題提出期限を5/31まで延長します', date: '4月17日', by: '事務局', unread: true },
  { id: 2, title: '堀江メンターによるライブQ&A (4/22 19:00) 開催予定', date: '4月15日', by: '運営', unread: true },
  { id: 3, title: '【重要】JavaScriptセクション 教材 v1.2 への更新', date: '4月12日', by: 'コース作成', unread: false },
];

export const REVIEW_QUEUE: ReviewItem[] = [
  { id: 'r1', student: '田中 翔太', initials: 'TS', c: 'c1', course: 'Web開発基礎', assignment: 'ランディングページ模写', submittedAt: '2時間前', aiReady: true, priority: 'high' },
  { id: 'r2', student: '佐藤 美咲', initials: 'SM', c: 'c2', course: 'Web開発基礎', assignment: 'JS基礎 確認課題', submittedAt: '4時間前', aiReady: true, priority: 'normal' },
  { id: 'r3', student: '鈴木 健一', initials: 'SK', c: 'c3', course: 'React入門', assignment: 'カウンターアプリ実装', submittedAt: '昨日', aiReady: true, priority: 'normal' },
  { id: 'r4', student: '山田 優花', initials: 'YY', c: 'c4', course: '基本情報対策', assignment: 'アルゴリズム記述問題', submittedAt: '昨日', aiReady: false, priority: 'normal' },
  { id: 'r5', student: '渡辺 拓海', initials: 'WT', c: 'c5', course: 'Web開発基礎', assignment: 'ToDoアプリ（再提出）', submittedAt: '2日前', aiReady: true, priority: 'high' },
  { id: 'r6', student: '中村 理恵', initials: 'NR', c: 'c6', course: 'Git/GitHub', assignment: '最終確認課題', submittedAt: '3日前', aiReady: true, priority: 'low' },
];

export const SUBMITTED_CODE: string[] = [
  '// ToDo アプリ — 田中 翔太',
  '// script.js',
  '',
  'const todos = []',
  '',
  'function addTodo(text) {',
  '    if(text == "") return;',
  '    todos.push({text: text, done: false})',
  '    render()',
  '}',
  '',
  'function toggleTodo(i) {',
  '    todos[i].done = !todos[i].done',
  '    render()',
  '}',
  '',
  'function deleteTodo(i) {',
  '    todos.splice(i, 1)',
  '    render()',
  '}',
  '',
  'function render() {',
  '    const list = document.getElementById("list")',
  '    list.innerHTML = ""',
  '    for(var i=0; i<todos.length; i++) {',
  '        const li = document.createElement("li")',
  '        li.innerHTML = todos[i].text',
  '        list.appendChild(li)',
  '    }',
  '}',
  '',
  'document.getElementById("add").onclick = function() {',
  '    addTodo(document.getElementById("input").value)',
  '}',
];

export const AI_SUGGESTIONS: AISuggestion[] = [
  {
    id: 's1',
    line: 7,
    severity: 'med',
    category: '等価演算子',
    body: '`==` は型変換を伴う緩い比較です。厳密等価 `===` を使用してください。空文字列のチェックは `text.trim() === ""` が望ましいです。',
    adopted: null,
  },
  {
    id: 's2',
    line: 22,
    severity: 'high',
    category: 'XSS脆弱性',
    body: '`innerHTML` にユーザー入力を直接挿入すると XSS の危険があります。`textContent` を使うか、サニタイズ処理を追加してください。',
    adopted: null,
  },
  {
    id: 's3',
    line: 21,
    severity: 'low',
    category: 'ES2015+',
    body: '`var` ではなく `let` / `const` の使用を推奨します。`for...of` ループの方が読みやすくなります。',
    adopted: null,
  },
  {
    id: 's4',
    line: 4,
    severity: 'low',
    category: '状態管理',
    body: 'モジュールスコープの配列ではなく、クラスやクロージャで状態をカプセル化すると、今後の拡張性が高まります。',
    adopted: null,
  },
];

export const RUBRIC: RubricCriterion[] = [
  { id: 'rb1', name: '機能要件の達成', desc: '追加・完了・削除が動作すること', max: 4, score: 3 },
  { id: 'rb2', name: 'コード可読性', desc: '命名・コメント・一貫性', max: 4, score: 3 },
  { id: 'rb3', name: '保守性・設計', desc: '関数分割・再利用性', max: 4, score: 2 },
  { id: 'rb4', name: 'セキュリティ配慮', desc: 'XSS・入力検証', max: 4, score: 1 },
];


export const ENROLLMENT_TREND: number[] = [
  32, 45, 51, 63, 78, 89, 102, 118, 132, 141, 156, 163,
];

export const COMPLETION_BY_COURSE: CompletionByCourse[] = [
  { name: 'Web開発基礎', n: 48, pct: 72 },
  { name: 'Git / GitHub', n: 52, pct: 94 },
  { name: 'React入門', n: 28, pct: 41 },
  { name: '基本情報 対策', n: 35, pct: 18 },
  { name: 'Python基礎', n: 22, pct: 63 },
];

export const STUMBLES: Stumble[] = [
  { q: 'DOM操作 — イベント伝播とバブリング', wrong: 68, n: 142 },
  { q: 'JavaScript — thisの束縛', wrong: 61, n: 142 },
  { q: 'CSS — z-index / stacking context', wrong: 54, n: 138 },
  { q: 'HTTP — CORSとプリフライト', wrong: 47, n: 105 },
  { q: 'Git — rebase vs merge', wrong: 38, n: 167 },
];
