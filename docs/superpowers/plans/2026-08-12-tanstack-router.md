# TanStack Router 導入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/web` の独自ステートマシン(`page` state + `renderPage()`)を TanStack Router のファイルベースルーティングに置き換え、URL を画面状態の真実にする。

**Architecture:** `src/routes/__root.tsx` + 公開3ルート + pathless layout `_app`(旧 MainApp のロジックを `AppShell` コンポーネントへ移植し Context で配下へ供給)。既存画面コンポーネントは無改変で、各ルートは Context + path params から props を組み立てる薄いラッパー。子コンポーネントの `setPage(key)` インターフェースは維持し、シェル内のアダプタが旧ページキー → `router.navigate()` に変換する。

**Tech Stack:** @tanstack/react-router / @tanstack/router-plugin(Vite)、React 19、Vite 5。

**Spec:** `docs/superpowers/specs/2026-08-12-tanstack-router-design.md`

## Global Constraints

- 既存画面コンポーネント(components/ 配下)は原則無改変。変更は shell / routes / main.tsx に閉じる
- 手動検証は `bun run build && bun run preview`(:4173)。vite dev は practice ルートでクラッシュするため使わない(CLAUDE.md)
- 各タスク末で `bun run typecheck && bun run build` が通ること(web に unit test は無い — vitest は `packages/**` のみ対象)
- lint は Biome(`bun run lint`)
- 既発行URL `/?cert=<CODE>` の互換リダイレクト必須
- vite.config.ts の manualChunks / worker 設定は変更しない

---

### Task 1: ルーター導入 + 公開ルート(既存 App は暫定フォールバック)

**Files:**
- Modify: `apps/web/package.json`(deps 追加は bun コマンドで)
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/src/routes/__root.tsx`
- Create: `apps/web/src/routes/support.tsx`
- Create: `apps/web/src/routes/auth.callback.tsx`
- Create: `apps/web/src/routes/verify.$certCode.tsx`
- Create: `apps/web/src/routes/index.tsx`(暫定: cert リダイレクト + 旧 `<App />`)
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`(default export の手動 pathname 分岐を削除し `MainApp` を default export に)
- 自動生成: `apps/web/src/routeTree.gen.ts`(コミットする)

**Interfaces:**
- Produces: ルート `/support` `/auth/callback` `/verify/$certCode`、`/`(暫定で旧アプリ全体)。`__root` が `<Outlet />` + `<Toaster />` を描画(以後、各画面での `<Toaster />` 重複は不要)

- [ ] **Step 1: 依存追加**

```bash
cd apps/web && bun add @tanstack/react-router && bun add -d @tanstack/router-plugin
```

- [ ] **Step 2: Vite プラグイン追加**

`vite.config.ts` の import に追記し、plugins 先頭(react() より前)に挿入:

```ts
import { tanstackRouter } from '@tanstack/router-plugin/vite';
// ...
plugins: [
  tanstackRouter({ target: 'react', autoCodeSplitting: false }),
  react(),
  tailwindcss(),
  copySqlJsWasm(),
  copyPdfjsAssets(),
],
```

`autoCodeSplitting: false` — 既存の manualChunks / lazy 設計(vite.config コメント参照)に干渉させない。

- [ ] **Step 3: __root ルート作成**

`src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { GenericEmpty } from '@/components/admin/AdminGeneric';

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  notFoundComponent: () => <GenericEmpty page="not-found" />,
});
```

- [ ] **Step 4: 公開ルート3つ作成**

`src/routes/support.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { SupportPage } from '@/components/public/SupportPage';

export const Route = createFileRoute('/support')({
  component: SupportPage,
});
```

`src/routes/auth.callback.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { AuthCallback } from '@/components/shell/AuthCallback';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
});
```

`src/routes/verify.$certCode.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PublicCertificateVerify } from '@/components/public/PublicCertificateVerify';

export const Route = createFileRoute('/verify/$certCode')({
  component: VerifyPage,
});

function VerifyPage() {
  const { certCode } = Route.useParams();
  return <PublicCertificateVerify certCode={certCode} />;
}
```

- [ ] **Step 5: 暫定 index ルート(cert リダイレクト + 旧アプリ)**

`src/routes/index.tsx`:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import App from '@/App';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { cert?: string } =>
    typeof search.cert === 'string' ? { cert: search.cert } : {},
  beforeLoad: ({ search }) => {
    // 既発行の修了証URL /?cert=CODE の互換リダイレクト
    if (search.cert) {
      throw redirect({ to: '/verify/$certCode', params: { certCode: search.cert } });
    }
  },
  component: App,
});
```

- [ ] **Step 6: App.tsx の手動 pathname 分岐を削除**

`App.tsx` の `export default function App()`(certCode / `/auth/callback` / `/support` の分岐と各所の `<Toaster />` 併記)を丸ごと削除し、`MainApp` を `export default function App()` に改名。`MainApp` 末尾 return 内の `<Toaster />` も削除(__root が描画)。不要 import(`PublicCertificateVerify`, `AuthCallback`, `SupportPage`, `Toaster`)を整理。

- [ ] **Step 7: main.tsx をルーターに切替**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import './index.css';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

- [ ] **Step 8: ビルド検証**

```bash
bun run typecheck && bun run build
```

Expected: PASS(`routeTree.gen.ts` が生成される)。失敗したら生成物と route ファイルの整合を直す。

- [ ] **Step 9: preview で手動確認**

`bun run preview` で `/`(旧アプリ全体が従来どおり)、`/support`、`/verify/DUMMY`、`/?cert=DUMMY` → `/verify/DUMMY` リダイレクトを確認。

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(web): TanStack Router を導入し公開ルートを移行"
```

---

### Task 2: AppShell 抽出(layout route `_app` + Context + setPage アダプタ)

**Files:**
- Create: `apps/web/src/components/shell/AppShell.tsx`(旧 MainApp 本体の移植先)
- Create: `apps/web/src/components/shell/app-shell-context.ts`
- Create: `apps/web/src/routes/_app.tsx`
- Modify: `apps/web/src/routes/index.tsx`(暫定 App 描画をやめ `_app/index.tsx` へ — Task 3 で)

**Interfaces:**
- Produces: `useAppShell(): AppShellValue` — 配下ルートが使う。`AppShellValue` は旧 `RenderParams` から `page`/`deepLink*` を除き、以下を持つ:

```ts
export interface AppShellValue {
  role: Role;
  setPage: (p: string) => void;          // 旧ページキー互換アダプタ
  courses: Course[];
  setCurrentCourse: (c: Course) => void; // 選択コースを控えて course-detail 遷移に使う
  onOpenLesson: (course: Course, lessonId: string) => void;
  onActiveLessonChange: (courseId: string, lessonId: string) => void;
  onOpenAIBot: () => void;
  setAIContext: (ctx: ChatContext) => void;
  tenantId: Tenant['id'];
  tenantName: string;
  currentUserId: string | null;
  backendEnabled: boolean;
  onOpenReview: (id: string) => void;
  studentName: string;
  studentInitials: string;
  announcementsHook: UseAnnouncementsResult;
  coursesError: string | null;
  onOpenSubmission: (submissionId: string) => void;
  profileRole?: ProfileRole;
  profile: Profile | null;
  onProfileUpdated: () => Promise<void>;
  highlightCourse: { id: string; seq: number } | null; // 検索→courses ハイライト用
}
```

- [ ] **Step 1: Context ファイル作成**

`src/components/shell/app-shell-context.ts`: 上記 `AppShellValue` と

```ts
import { createContext, useContext } from 'react';

export const AppShellContext = createContext<AppShellValue | null>(null);

export function useAppShell(): AppShellValue {
  const v = useContext(AppShellContext);
  if (!v) throw new Error('useAppShell must be used under _app route');
  return v;
}
```

- [ ] **Step 2: AppShell.tsx へ MainApp を移植**

`App.tsx` の中身(MainApp と補助関数 `loadSaved` / `PAGE_LABELS` / `roleLabel` / `mapProfileRole` / `pickSource` / `EmptyCoursesNotice`)を `AppShell.tsx` へ移し、次を変更する:

1. **`renderPage(...)` 呼び出しを `<AppShellContext.Provider value={shellValue}><Outlet /></AppShellContext.Provider>` に置換。** `renderPage` / `RenderParams` は削除(各ルートファイルへ分解 — Task 3/4)。
2. **`page` state を削除**し、現在ページキーは URL から導出する(Sidebar のアクティブ表示と crumbs 用):

```ts
const routerState = useRouterState();
const pathname = routerState.location.pathname;
const page = pageKeyFromPath(pathname); // 下記マップの逆引き。先頭一致で判定

const PATH_BY_PAGE: Record<string, string> = {
  dash: '/', courses: '/courses', cert: '/certificates',
  'review-queue': '/review-queue', gradebook: '/gradebook', students: '/students',
  users: '/users', enrollments: '/enrollments', assignments: '/assignments',
  audit: '/audit', orgs: '/orgs', report: '/report', settings: '/settings',
};

function pageKeyFromPath(path: string): string {
  if (path.startsWith('/courses/')) {
    return path.includes('/lessons/') ? 'lesson' : 'course-detail';
  }
  if (path.startsWith('/reviews/')) return 'review';
  if (path.startsWith('/submissions/')) return 'submission-result';
  const hit = Object.entries(PATH_BY_PAGE).find(([, p]) => p === path);
  return hit ? hit[0] : path.replace(/^\//, '') || 'dash';
}
```

3. **`setPage` アダプタ**(子コンポーネントの旧インターフェース維持の要):

```ts
const selectedCourseRef = useRef<Course | null>(null);
const reviewIdRef = useRef<string | null>(null);
const resultIdRef = useRef<string | null>(null);

const setCurrentCourse = useCallback((c: Course) => { selectedCourseRef.current = c; }, []);
const onOpenReview = useCallback((id: string) => { reviewIdRef.current = id; }, []);
const onOpenSubmissionId = useCallback((id: string) => { resultIdRef.current = id; }, []);

const setPage = useCallback((key: string) => {
  setHighlightCourse(null);
  if (key === '__logout') { void doLogout(); return; }       // 旧疑似ページ
  if (key === '__ai') { setAiOpen(true); return; }
  if (key === 'course-detail') {
    const c = selectedCourseRef.current;
    void navigate(c ? { to: '/courses/$courseId', params: { courseId: c.id } } : { to: '/courses' });
    return;
  }
  if (key === 'lesson') {
    const c = selectedCourseRef.current;
    if (c) void navigate({ to: '/courses/$courseId', params: { courseId: c.id } });
    return; // レッスン遷移は onOpenLesson 経由が正: setPage('lesson') 単独は詳細へ
  }
  if (key === 'review') {
    const id = reviewIdRef.current;
    void navigate(id ? { to: '/reviews/$submissionId', params: { submissionId: id } } : { to: '/review-queue' });
    return;
  }
  if (key === 'submission-result') {
    const id = resultIdRef.current;
    if (id) void navigate({ to: '/submissions/$submissionId', params: { submissionId: id } });
    return;
  }
  void navigate({ to: PATH_BY_PAGE[key] ?? '/' });
}, [navigate]);
```

`doLogout` は旧 `__logout` effect の中身(authSignOut → setStage('login') → navigate `/` → toast)。旧 `__logout` / `__ai` effect は削除。

4. **`openLesson` はナビゲーションに置換**(lastLocation 保存は維持):

```ts
const openLesson = useCallback((course: Course, lessonId: string) => {
  selectedCourseRef.current = course;
  setLastLocation({ courseId: course.id, lessonId });
  void navigate({
    to: '/courses/$courseId/lessons/$lessonId',
    params: { courseId: course.id, lessonId },
  });
}, [navigate]);
```

5. **`handleActiveLessonChange`**: lastLocation 更新に加えて URL を replace 同期(履歴を汚さない):

```ts
void navigate({
  to: '/courses/$courseId/lessons/$lessonId',
  params: { courseId, lessonId },
  replace: true,
});
```

6. **`handleSearchSelect`**: learner は `openLesson` / course-detail ナビに、staff は `setHighlightCourse({id, seq: prev+1})` + `/courses` ナビに置換(`deepLinkCourse` state を `highlightCourse` に改名して存続。`deepLinkLesson` state は削除 — レッスン初期位置は URL param が担う)。
7. **削除**: `reviewSubmissionId` / `resultSubmissionId` state(refs に置換)、リロード復帰 effect(`page !== 'lesson'` の courses→currentCourse 解決 — ルート側で解決)、`orgs` ガード effect(ルート側に移動)、`aiContext` リセット effect は `pathname.includes('/lessons/')` 判定に書換。localStorage 保存 object から `page` / `reviewSubmissionId` / `resultSubmissionId` を外す(`stage`/`role`/`tenantId`/`showAIBot`/`lastLocation` は維持)。
8. **`currentCourse` state 削除**: crumbs の course-detail タイトルは配下ルートが表示するため、crumbs は `PAGE_LABELS[page] ?? page` のままで良い(course-detail のときは courses から `pathname` の courseId を find してタイトルに)。
9. 認証分岐(authLoading / LoginScreen / InviteRequired / fixtures stage)は移植のまま(その場描画、リダイレクトなし)。各分岐の `<Toaster />` 併記は削除。

- [ ] **Step 3: `_app.tsx` layout route 作成**

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/shell/AppShell';

export const Route = createFileRoute('/_app')({
  component: () => <AppShell />,
});
```

(`AppShell` が内部で `<Outlet />` を描画する。)

- [ ] **Step 4: typecheck**

```bash
bun run typecheck
```

Expected: この時点では旧 `App.tsx`(暫定 index が参照)と併存で PASS。AppShell がまだ未参照でも可。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(web): AppShell レイアウトと setPage アダプタを追加"
```

---

### Task 3: learner 系ルート + 暫定 index の置換

**Files:**
- Create: `apps/web/src/routes/_app/index.tsx`
- Create: `apps/web/src/routes/_app/courses.index.tsx`
- Create: `apps/web/src/routes/_app/courses.$courseId.index.tsx`
- Create: `apps/web/src/routes/_app/courses.$courseId.lessons.$lessonId.tsx`
- Create: `apps/web/src/routes/_app/certificates.tsx`
- Create: `apps/web/src/routes/_app/submissions.$submissionId.tsx`
- Create: `apps/web/src/routes/_app/settings.tsx`
- Delete: `apps/web/src/routes/index.tsx`(暫定)— cert リダイレクトは `_app/index.tsx` に移す
- Modify: `apps/web/src/components/shell/AppShell.tsx`(EmptyCoursesNotice を export)

**Interfaces:**
- Consumes: `useAppShell()`(Task 2)
- Produces: `/` `/courses` `/courses/$courseId` `/courses/$courseId/lessons/$lessonId` `/certificates` `/submissions/$submissionId` `/settings`

- [ ] **Step 1: `_app/index.tsx`(ダッシュボード、ロール別)**

旧 `renderPage` の `dash` 分岐3つをそのまま移す:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { LearnerDashboard } from '@/components/learner/LearnerDashboard';
import { InstructorDashboard } from '@/components/instructor/InstructorDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const Route = createFileRoute('/_app/')({
  validateSearch: (search: Record<string, unknown>): { cert?: string } =>
    typeof search.cert === 'string' ? { cert: search.cert } : {},
  beforeLoad: ({ search }) => {
    if (search.cert) {
      throw redirect({ to: '/verify/$certCode', params: { certCode: search.cert } });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const s = useAppShell();
  if (s.role === 'instructor') {
    return (
      <InstructorDashboard
        tenantId={s.tenantId}
        setPage={s.setPage}
        onOpenReview={s.onOpenReview}
        backendEnabled={s.backendEnabled}
      />
    );
  }
  if (s.role === 'admin') {
    return <AdminDashboard tenantId={s.tenantId} backendEnabled={s.backendEnabled} />;
  }
  return (
    <LearnerDashboard
      setPage={s.setPage}
      onOpenLesson={s.onOpenLesson}
      courses={s.courses}
      announcementsHook={s.announcementsHook}
      coursesError={s.coursesError}
      onOpenSubmission={s.onOpenSubmission}
      studentName={s.studentName}
      currentUserId={s.currentUserId}
      backendEnabled={s.backendEnabled}
    />
  );
}
```

- [ ] **Step 2: `_app/courses.index.tsx`(ロール別 + highlight search param)**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { CourseList } from '@/components/learner/CourseList';
import { InstructorGeneric } from '@/components/instructor/InstructorGeneric';
import { AdminCoursesPage } from '@/components/admin/AdminCoursesPage';

export const Route = createFileRoute('/_app/courses/')({
  component: CoursesPage,
});

function CoursesPage() {
  const s = useAppShell();
  if (s.role === 'admin') {
    return (
      <AdminCoursesPage
        key={s.highlightCourse ? `${s.highlightCourse.id}:${s.highlightCourse.seq}` : 'list'}
        tenantId={s.tenantId}
        initialCourseId={s.highlightCourse?.id ?? null}
      />
    );
  }
  if (s.role === 'instructor') {
    return (
      <InstructorGeneric
        page="courses"
        tenantId={s.tenantId}
        backendEnabled={s.backendEnabled}
        highlightCourseId={s.highlightCourse?.id ?? null}
        highlightSeq={s.highlightCourse?.seq ?? 0}
      />
    );
  }
  return <CourseList setPage={s.setPage} courses={s.courses} setCurrentCourse={s.setCurrentCourse} />;
}
```

(設計の `?highlight=` search param は shell state `highlightCourse` で代替する — 検索パレット遷移は同一セッション内でしか起きず、URL 共有要件がないため。)

- [ ] **Step 3: `_app/courses.$courseId.index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { EmptyCoursesNotice } from '@/components/shell/AppShell';
import { CourseDetail } from '@/components/learner/CourseDetail';

export const Route = createFileRoute('/_app/courses/$courseId/')({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const s = useAppShell();
  const { courseId } = Route.useParams();
  const target = s.courses.find((c) => c.id === courseId) ?? s.courses[0];
  if (!target) return <EmptyCoursesNotice setPage={s.setPage} />;
  return (
    <CourseDetail
      course={target}
      setPage={s.setPage}
      onOpenLesson={(lessonId) => s.onOpenLesson(target, lessonId)}
      onOpenSubmission={s.onOpenSubmission}
    />
  );
}
```

- [ ] **Step 4: `_app/courses.$courseId.lessons.$lessonId.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { EmptyCoursesNotice } from '@/components/shell/AppShell';
import { LessonPlayer } from '@/components/learner/LessonPlayer';

export const Route = createFileRoute('/_app/courses/$courseId/lessons/$lessonId')({
  component: LessonPage,
});

function LessonPage() {
  const s = useAppShell();
  const { courseId, lessonId } = Route.useParams();
  const target = s.courses.find((c) => c.id === courseId) ?? s.courses[0];
  if (!target) return <EmptyCoursesNotice setPage={s.setPage} />;
  return (
    <LessonPlayer
      course={target}
      setPage={s.setPage}
      onOpenAIBot={s.onOpenAIBot}
      setAIContext={s.setAIContext}
      tenantId={s.tenantId}
      studentName={s.studentName}
      studentInitials={s.studentInitials}
      initialLesson={{ id: lessonId, seq: 0 }}
      onActiveLessonChange={s.onActiveLessonChange}
    />
  );
}
```

**注意(ループ防止):** `onActiveLessonChange` は URL を replace するため params が変わり再レンダーされる。`LessonPlayer` の `initialLesson` 適用ロジックを読み、「seq が変わったときのみ適用」なら seq=0 固定で安全。「id 変化でも適用」なら適用前に現在のアクティブレッスン id と比較するガードが必要 — 実装時に `LessonPlayer.tsx` を確認して合わせる。

- [ ] **Step 5: `_app/certificates.tsx` / `_app/submissions.$submissionId.tsx` / `_app/settings.tsx`**

`certificates.tsx`(旧 `cert` 分岐):

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { CertificatePage } from '@/components/learner/Certificate';

export const Route = createFileRoute('/_app/certificates')({
  component: () => {
    const s = useAppShell();
    return (
      <CertificatePage
        courses={s.courses}
        currentUserId={s.currentUserId}
        studentName={s.studentName}
        studentInitials={s.studentInitials}
        tenantName={s.tenantName}
        backendEnabled={s.backendEnabled}
      />
    );
  },
});
```

`submissions.$submissionId.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { ReviewResultView } from '@/components/learner/ReviewResultView';

export const Route = createFileRoute('/_app/submissions/$submissionId')({
  component: () => {
    const s = useAppShell();
    const { submissionId } = Route.useParams();
    return <ReviewResultView submissionId={submissionId} setPage={s.setPage} />;
  },
});
```

`settings.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { SettingsPage } from '@/components/shell/SettingsPage';

export const Route = createFileRoute('/_app/settings')({
  component: () => {
    const s = useAppShell();
    return (
      <SettingsPage
        role={s.role}
        profile={s.profile}
        tenantName={s.tenantName}
        backendEnabled={s.backendEnabled}
        onProfileUpdated={s.onProfileUpdated}
      />
    );
  },
});
```

- [ ] **Step 6: 暫定 `routes/index.tsx` を削除**(cert リダイレクトは `_app/index.tsx` へ移動済み)。`AppShell.tsx` の `EmptyCoursesNotice` に `export` を付ける。

- [ ] **Step 7: typecheck + build**

```bash
bun run typecheck && bun run build
```

Expected: PASS。旧 `App.tsx` はどこからも参照されなくなるが削除は Task 4 末尾で。

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(web): learner 系画面を TanStack Router ルートへ移行"
```

---

### Task 4: instructor / admin 系ルート + 旧 App.tsx 削除

**Files:**
- Create: `apps/web/src/routes/_app/review-queue.tsx`
- Create: `apps/web/src/routes/_app/reviews.$submissionId.tsx`
- Create: `apps/web/src/routes/_app/gradebook.tsx`
- Create: `apps/web/src/routes/_app/students.tsx`
- Create: `apps/web/src/routes/_app/users.tsx`
- Create: `apps/web/src/routes/_app/enrollments.tsx`
- Create: `apps/web/src/routes/_app/assignments.tsx`
- Create: `apps/web/src/routes/_app/audit.tsx`
- Create: `apps/web/src/routes/_app/orgs.tsx`
- Create: `apps/web/src/routes/_app/report.tsx`
- Delete: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `useAppShell()`(Task 2)

- [ ] **Step 1: instructor ルート**

`review-queue.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { ReviewQueue } from '@/components/instructor/ReviewQueue';

export const Route = createFileRoute('/_app/review-queue')({
  component: () => {
    const s = useAppShell();
    return <ReviewQueue tenantId={s.tenantId} setPage={s.setPage} onOpenReview={s.onOpenReview} />;
  },
});
```

`reviews.$submissionId.tsx`(旧 `review` 分岐 — submissionId を URL から渡す):

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { ReviewEditor } from '@/components/instructor/ReviewEditor';

export const Route = createFileRoute('/_app/reviews/$submissionId')({
  component: () => {
    const s = useAppShell();
    const { submissionId } = Route.useParams();
    return <ReviewEditor tenantId={s.tenantId} submissionId={submissionId} setPage={s.setPage} />;
  },
});
```

`gradebook.tsx`(instructor と admin 共通):

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { Gradebook } from '@/components/instructor/Gradebook';

export const Route = createFileRoute('/_app/gradebook')({
  component: () => {
    const s = useAppShell();
    return <Gradebook courses={s.courses} />;
  },
});
```

`students.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { InstructorGeneric } from '@/components/instructor/InstructorGeneric';

export const Route = createFileRoute('/_app/students')({
  component: () => {
    const s = useAppShell();
    return (
      <InstructorGeneric
        page="students"
        tenantId={s.tenantId}
        backendEnabled={s.backendEnabled}
        highlightCourseId={null}
        highlightSeq={0}
      />
    );
  },
});
```

- [ ] **Step 2: admin ルート**

`users.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { UsersAdmin } from '@/components/admin/UsersAdmin';

export const Route = createFileRoute('/_app/users')({
  component: () => {
    const s = useAppShell();
    return (
      <UsersAdmin
        tenantId={s.tenantId}
        tenantName={s.tenantName}
        currentUserId={s.currentUserId}
        currentUserRole={s.profileRole ?? null}
        backendEnabled={s.backendEnabled}
      />
    );
  },
});
```

`enrollments.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { AdminEnrollmentsPage } from '@/components/admin/AdminEnrollmentsPage';

export const Route = createFileRoute('/_app/enrollments')({
  component: () => {
    const s = useAppShell();
    return (
      <AdminEnrollmentsPage
        key={s.tenantId}
        tenantId={s.tenantId}
        currentUserId={s.currentUserId}
        backendEnabled={s.backendEnabled}
      />
    );
  },
});
```

`assignments.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { AdminAssignmentsPage } from '@/components/admin/AdminAssignmentsPage';

export const Route = createFileRoute('/_app/assignments')({
  component: () => {
    const s = useAppShell();
    return <AdminAssignmentsPage tenantId={s.tenantId} />;
  },
});
```

`audit.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { AdminAuditPage } from '@/components/admin/AdminAuditPage';

export const Route = createFileRoute('/_app/audit')({
  component: () => {
    const s = useAppShell();
    return <AdminAuditPage tenantId={s.tenantId} backendEnabled={s.backendEnabled} />;
  },
});
```

`orgs.tsx`(権限ガードは画面内表示 — 旧挙動どおり):

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { AdminOrganizationsPage } from '@/components/admin/AdminOrganizationsPage';

export const Route = createFileRoute('/_app/orgs')({
  component: OrgsPage,
});

function OrgsPage() {
  const s = useAppShell();
  if (s.profileRole !== 'platform_admin') {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="text-[15px] font-semibold mb-2">権限がありません</div>
        <div className="text-[12.5px] text-ink-3 mb-4">
          組織マスタはプラットフォーム管理のみ利用できます。
        </div>
        <button
          type="button"
          className="text-[12.5px] text-brand underline underline-offset-2"
          onClick={() => s.setPage('dash')}
        >
          ダッシュボードに戻る
        </button>
      </div>
    );
  }
  return <AdminOrganizationsPage backendEnabled={s.backendEnabled} />;
}
```

`report.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { AdminReportPage } from '@/components/admin/AdminReportPage';

export const Route = createFileRoute('/_app/report')({
  component: () => {
    const s = useAppShell();
    return <AdminReportPage tenantId={s.tenantId} backendEnabled={s.backendEnabled} />;
  },
});
```

- [ ] **Step 3: 旧 `App.tsx` を削除**し、残参照が無いことを確認:

```bash
cd apps/web && grep -rn "from '@/App'" src || true
```

Expected: ヒットなし。

- [ ] **Step 4: typecheck + lint + build**

```bash
bun run typecheck && bun run lint && bun run build
```

Expected: すべて PASS。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(web): instructor/admin 画面をルートへ移行し旧 App.tsx を削除"
```

---

### Task 5: preview での手動検証(全ロール)

**Files:** なし(検証タスク。修正が出たら該当ファイルを直す)

- [ ] **Step 1: ビルド + preview 起動**

```bash
bun run build
bun run preview
```

(fixtures モード: `apps/web/.env.local` が無い / `VITE_SERVER_URL` 未設定の状態で検証可能。バックエンド検証をする場合は CLAUDE.md の手順で API + seed を用意し、preview の origin `http://localhost:4173` を `ALLOWED_ORIGINS` に追加する。)

- [ ] **Step 2: 検証チェックリスト(fixtures モック導線)**

- `/` → ログイン → tenant-select → ダッシュボード表示、URL が `/` のまま
- サイドバー遷移で URL が `/courses` `/certificates` 等に変わる
- コース一覧 → コース詳細(`/courses/<id>`)→ レッスン(`/courses/<id>/lessons/<id>`)
- レッスン画面でリロード → 同じレッスンに復帰
- ブラウザ戻る/進むが機能する
- `/?cert=DUMMY` → `/verify/DUMMY` にリダイレクトされ検証画面が出る
- `/support` 直アクセス
- backtick → Tweaks で instructor / admin に切替え、各画面(添削待ち→添削エディタ、コース管理、ユーザー管理等)が開く
- 存在しないURL(`/nope`)で notFound 表示
- 検索パレット(instructor/admin)でコースを選ぶ → `/courses` でハイライト
- ログアウト → ログイン画面

- [ ] **Step 3: 問題があれば修正してコミット**、最後に全ゲート再実行:

```bash
bun run lint && bun run typecheck && bun run test && bun run build
```

- [ ] **Step 4: 最終コミット(残変更があれば)**

```bash
git add -A && git commit -m "fix(web): ルーティング移行の検証で見つかった問題を修正"
```
