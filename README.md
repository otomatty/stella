# FALCON INFORMAL (Vite + React + TypeScript + shadcn/ui)

FALCON INFORMAL のプロトタイプ。
部活動指導者講習とSES未経験エンジニア育成の両事業を単一基盤で支える。

## スタック

- Vite 5 + React 18 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Radix UI プリミティブ
- lucide-react アイコン
- sonner トースト
- Bun (パッケージマネージャ)

## 開発

```bash
bun install
bun run dev        # http://localhost:5173
bun run build      # production build → dist/
bun run preview
bun run typecheck  # tsc -b --noEmit
```

## プロジェクト構成

```
src/
├── main.tsx                     React エントリ
├── App.tsx                      ルーティング / テナント・ロール切替 / 永続化
├── index.css                    Tailwind + 設計トークン (@theme inline)
├── lib/
│   ├── utils.ts                 cn() ヘルパー
│   └── icons.tsx                lucide-react 再エクスポート + Google SVG
├── data/
│   ├── types.ts                 ドメイン型
│   └── fixtures.ts              静的データ (テナント / コース / 添削キュー …)
└── components/
    ├── ui/                      shadcn/ui プリミティブ (Button, Card, Badge, …)
    ├── shell/                   Sidebar, Topbar, LoginScreen, TenantSelect
    ├── common/                  PageHeader, KpiCard, CourseThumb, Brand, AIChatBot, TweaksPanel
    ├── learner/                 LearnerDashboard, CourseList, CourseDetail, LessonPlayer, Certificate, StandaloneQA
    ├── instructor/              InstructorDashboard, ReviewQueue, ReviewEditor, InstructorGeneric
    └── admin/                   AdminDashboard, UsersAdmin, AdminGeneric
```

## ロール切替

バックティック (`` ` ``) キーで Tweaks パネルを開き、ロール・テナント・AI
アシスタントの表示を切替。状態は `localStorage` に `lms_state` として永続化。

- **受講者 (Learner)** — ログイン、ダッシュボード、コース一覧、レッスン視聴 (動画/テキスト/小テスト/Web IDE/課題)、Q&A、修了証
- **講師 (Instructor)** — ダッシュボード、添削キュー、AI下書き付き添削エディタ (インラインコメント・ルーブリック・総評)
- **テナント管理者 (Admin)** — KPIダッシュボード、ユーザー管理、コース管理、監査ログ

## デザイントークン

`src/index.css` の `:root` に生トークン、`@theme inline` で Tailwind
ユーティリティに射影している。

- Surface: warm off-white `oklch(98.5% 0.004 85)` → `--bg`
- Ink: near-black `oklch(22% 0.01 260)` → `--ink`
- Brand: deep indigo `oklch(46% 0.15 265)` → `--brand`
- Typography: Inter + Noto Sans JP + JetBrains Mono
- Radius: 4 / 8 / 12 / 16 px
- Status: success (green), warning (amber), danger (red), info (blue)

## v1 プロトタイプとの差分

- Pure CSS (1500行) → Tailwind CSS v4 + shadcn/ui
- JSX → TypeScript (`strict: true`)
- 自作 SVG アイコン → lucide-react
- `window.XYZ` グローバル → `import`/`export`
- `localStorage` の `lms_state` キー・形式は互換

旧実装は `src-legacy/` に保全している (参照専用 / 削除可)。
