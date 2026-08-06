/**
 * D1 seed と実データ UI のテナント / コースカタログ。
 * `export-seed-sql.ts` および `VITE_SERVER_URL` 未設定のデモ経路が参照する。
 * 提出キュー・KPI チャート等のデモ専用データは `@/demo/fixtures` に分離済み。
 */

import type { Course, Tenant } from "./types";

export const TENANTS: Tenant[] = [
  { id: "coach", name: "部活動指導者", subtitle: "地域スポーツ指導者講習", icon: "school", active: 132 },
  { id: "ses", name: "SES未経験エンジニア育成", subtitle: "エンジニア研修 / 資格対策", icon: "cpu", active: 87 },
];

const SES_WEB_FUNDAMENTALS_COURSE_UUID =
  "6b200629-c6af-5746-bf86-69718cfacf2f";
const SES_WEB_MATERIALS_PREFIX = `tenant/ses/courses/${SES_WEB_FUNDAMENTALS_COURSE_UUID}`;

export const SES_COURSES: Course[] = [
  {
    id: "web-fundamentals",
    title: "Web開発基礎 — HTML / CSS / JavaScript",
    category: "フロントエンド",
    color: "indigo",
    duration: 28,
    lessonsCount: 29,
    progress: 62,
    enrolledBy: "堀江メンター",
    dueAt: "2026-05-31",
    description:
      "未経験者が3週間で実務レベルのHTML/CSS/JS基礎を身につけるためのコース。ハンズオン中心で、最終課題として簡易ToDoアプリを提出する。",
    sections: [
      {
        id: "s1",
        title: "01. Webの仕組み",
        lessons: [
          {
            id: "l1",
            title: "HTTPとクライアント/サーバー",
            type: "slides",
            duration: "12分",
            status: "done",
            pdfPath: `${SES_WEB_MATERIALS_PREFIX}/01-http.pdf`,
            totalPages: 18,
          },
          {
            id: "l2",
            title: "DNS・URL・ブラウザレンダリング",
            type: "video",
            duration: "09:20",
            status: "done",
            videoPath: `${SES_WEB_MATERIALS_PREFIX}/02-dns.mp4`,
            totalSec: 560,
          },
          { id: "l3", title: "確認テスト（全10問）", type: "quiz", duration: "10分", status: "done" },
        ],
      },
      {
        id: "s2",
        title: "02. HTML / CSS",
        lessons: [
          { id: "l4", title: "セマンティックHTML", type: "video", duration: "15:10", status: "done" },
          { id: "l5", title: "Flexbox と Grid", type: "video", duration: "18:30", status: "done" },
          { id: "l6", title: "レスポンシブデザイン", type: "text", duration: "8分", status: "done" },
          { id: "l7", title: "課題: ランディングページ模写", type: "assignment", duration: "提出", status: "done" },
        ],
      },
      {
        id: "s3",
        title: "03. JavaScript 基礎",
        lessons: [
          { id: "l8", title: "変数・型・制御構文", type: "video", duration: "22:00", status: "done" },
          { id: "l9", title: "配列・オブジェクト", type: "video", duration: "17:45", status: "done" },
          {
            id: "l10",
            title: "関数とスコープ",
            type: "video",
            duration: "19:30",
            status: "active",
            progress: 42,
            videoPath: `${SES_WEB_MATERIALS_PREFIX}/10-functions.mp4`,
            totalSec: 1170,
          },
          {
            id: "l11a",
            title: "【演習】hello を出力",
            type: "code",
            duration: "5分",
            status: "todo",
            assignmentId: "S0-Ch00-01-print-hello",
          },
          {
            id: "l11b",
            title: "【演習】変数の表示",
            type: "code",
            duration: "5分",
            status: "todo",
            assignmentId: "S0-Ch00-06-print-variable",
          },
          { id: "l11", title: "DOM操作入門", type: "video", duration: "16:20", status: "todo" },
          { id: "l12", title: "非同期処理（Promise / async）", type: "text", duration: "12分", status: "todo" },
          { id: "l13", title: "中間クイズ", type: "quiz", duration: "15分", status: "todo" },
        ],
      },
      {
        id: "s4",
        title: "04. 実習課題",
        lessons: [
          { id: "l14", title: "ToDoアプリ設計書", type: "text", duration: "10分", status: "locked" },
          {
            id: "l15",
            title: "Web IDE: マルチファイル演習",
            type: "code",
            duration: "提出",
            status: "todo",
            assignmentId: "S0-Ch00-08-multifile-demo",
          },
          { id: "l16", title: "最終課題レビュー", type: "assignment", duration: "提出", status: "locked" },
        ],
      },
      {
        id: "s5",
        title: "05. データベース入門 (SQL)",
        lessons: [
          {
            id: "l17",
            title: "SELECT 文の基礎",
            type: "code",
            duration: "5分",
            status: "todo",
            assignmentId: "S0-Sql-Ch00-01-select-hello",
          },
          {
            id: "l18",
            title: "WHERE 句で絞り込み",
            type: "code",
            duration: "7分",
            status: "todo",
            assignmentId: "S0-Sql-Ch00-02-where-filter",
          },
          {
            id: "l19",
            title: "GROUP BY で集計",
            type: "code",
            duration: "10分",
            status: "todo",
            assignmentId: "S0-Sql-Ch00-03-group-by",
          },
        ],
      },
    ],
  },
  {
    id: "git-basics",
    title: "Git / GitHub 実務ワークフロー",
    category: "ツール",
    color: "slate",
    duration: 8,
    lessonsCount: 10,
    progress: 100,
    dueAt: "2026-04-10",
    description: "実務で通用するブランチ戦略とPRレビューを学ぶ。",
    completed: true,
  },
  {
    id: "ciso-basic",
    title: "情報処理技術者試験 基本情報 — 対策講座",
    category: "資格対策",
    color: "green",
    duration: 40,
    lessonsCount: 36,
    progress: 18,
    dueAt: "2026-06-20",
  },
  {
    id: "react-intro",
    title: "React入門 — コンポーネント設計からフック活用まで",
    category: "フロントエンド",
    color: "amber",
    duration: 22,
    lessonsCount: 19,
    progress: 0,
    dueAt: null,
  },
];

export const COACH_COURSES: Course[] = [
  {
    id: "safety-1",
    title: "地域スポーツ指導者 安全管理研修",
    category: "必修",
    color: "indigo",
    lessonsCount: 12,
    progress: 78,
    dueAt: "2026-05-20",
  },
  {
    id: "comm-1",
    title: "子どもとのコミュニケーション実技",
    category: "必修",
    color: "green",
    lessonsCount: 8,
    progress: 45,
  },
  {
    id: "first-aid",
    title: "応急処置 / 救命講習",
    category: "必修",
    color: "amber",
    lessonsCount: 6,
    progress: 100,
    completed: true,
  },
];
