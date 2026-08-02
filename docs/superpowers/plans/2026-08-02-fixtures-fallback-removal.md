# fixtures フォールバック廃止（#60）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** バックエンド設定時は API/D1 の真実だけを UI に出し、fixtures への沈黙フォールバックを廃し、seed を冪等＋最小検証シナリオ付きにする。

**Architecture:** 局所修正。`courses-source` / `useAnnouncements` / `InstructorDashboard` の catch→fixtures とデモ KPI を削り、DEV 専用 source バナーをシェルに出す。seed は `export-seed-sql.ts` の UUID を決定論的にし、profiles / enrollment / submission を末尾で emit する。デモ専用（`VITE_SERVER_URL` 未設定）は現状維持。

**Tech Stack:** React 19 + Vite (`apps/web`)、Hono + D1 (`apps/api`)、Bun、`packages/shared/scripts/export-seed-sql.ts`

## Global Constraints

- 仕様: `docs/superpowers/specs/2026-08-02-fixtures-fallback-removal-design.md`
- 実データモード = `isBackendConfigured()` true → fixtures 禁止。失敗は `[]` + `error`、`source: "error"`
- デモ専用 = URL 未設定 → fixtures / Tweaks 維持
- `useResolvedAssignment` の shared カタログは変更しない
- fixtures ファイル削除・DataSource Provider 新設はしない
- 自動テストフレームワークなし → 検証は `bun run typecheck` + seed 2 回実行 + 手動確認
- コミットはユーザーが明示したときだけ行う（ユーザー規則）。プラン内の Commit ステップはステージング候補提示までとし、指示なしでは `git commit` しない

---

## ファイル構成

| ファイル | 役割 | 操作 |
|---------|------|------|
| `apps/web/src/data/courses-source.ts` | コース一覧／受講登録コースのソース | 変更 |
| `apps/web/src/hooks/useAnnouncements.ts` | お知らせソース | 変更 |
| `apps/web/src/components/instructor/InstructorDashboard.tsx` | 講師ダッシュ KPI / リスト | 変更 |
| `apps/web/src/components/learner/LearnerDashboard.tsx` | お知らせ error 表示 | 変更 |
| `apps/web/src/components/shell/DataSourceBanner.tsx` | DEV 専用 source バナー | 新規 |
| `apps/web/src/App.tsx` | source 集約・バナー配置・courses error 伝播 | 変更 |
| `packages/shared/scripts/export-seed-sql.ts` | 決定論的 UUID + 最小シナリオ | 変更 |
| `README.md` | seed ユーザー注記 | 変更 |

---

### Task 1: `courses-source` — 失敗時 fixtures 廃止

**Files:**
- Modify: `apps/web/src/data/courses-source.ts`

**Interfaces:**
- Produces:
  ```ts
  type DataSource = "db" | "fixtures" | "error";
  interface UseCoursesResult {
    courses: Course[];
    loading: boolean;
    error: string | null;
    source: DataSource;
  }
  ```
- `useCoursesForTenant` / `useEnrolledCoursesForTenant` の両方に適用

- [ ] **Step 1: 型と初期 state を実データ向けに直す**

ファイル先頭コメントを仕様に合わせて更新（「失敗時 fixtures」記述を削除）。

`UseCoursesResult` に `error` を追加し、`source` を `"db" | "fixtures" | "error"` にする。

両フックで:

```ts
const backend = isBackendConfigured();
const [courses, setCourses] = useState<Course[]>(() =>
  backend ? [] : fixturesFor(tenantId),
);
const [loading, setLoading] = useState(backend && enabled);
const [error, setError] = useState<string | null>(null);
const [source, setSource] = useState<DataSource>(backend ? "db" : "fixtures");
```

- [ ] **Step 2: catch で fixtures に戻さない**

`useCoursesForTenant` の catch を次に置き換える:

```ts
} catch (err) {
  console.error("[useCoursesForTenant] DB fetch failed", err);
  if (!cancelled) {
    setCourses([]);
    setSource("error");
    setError(err instanceof Error ? err.message : "fetch failed");
  }
}
```

成功パスでは `setError(null)` を入れる。デモ専用ブランチ（`!isBackendConfigured()`）は fixtures のまま、`setError(null)`。

`useEnrolledCoursesForTenant` の catch（「fallback to fixtures」）も同様に `[]` + `source: "error"` + `error` メッセージにする。個別 course fetch の `.catch → null` は維持（全体を error にしない）。

両方の `return` に `error` を含める。

- [ ] **Step 3: 退避が残っていないことを確認**

Run:
```bash
rg -n "fallback to fixtures|setSource\\(\"fixtures\"\\)" apps/web/src/data/courses-source.ts
```
Expected: デモ専用ブランチ（`!isBackendConfigured()`）での `setSource("fixtures")` のみ。catch 内に fixtures なし。

Run:
```bash
bun run typecheck
```
Expected: PASS（呼び出し側が `error` 未使用でも余剰プロパティは問題なし）。

- [ ] **Step 4: （ユーザー指示時のみ）Commit**

```bash
git add apps/web/src/data/courses-source.ts
git commit -m "$(cat <<'EOF'
fix(web): stop falling back to course fixtures when API fails

EOF
)"
```

---

### Task 2: `useAnnouncements` — 失敗時 fixtures 廃止

**Files:**
- Modify: `apps/web/src/hooks/useAnnouncements.ts`

**Interfaces:**
- Produces: `source: "db" | "fixtures" | "error"`（既存 `error` フィールドは維持）

- [ ] **Step 1: 初期 state とデモ分岐を揃える**

```ts
const backend = isBackendConfigured();
const [announcements, setAnnouncements] = useState<AnnouncementRow[]>(() =>
  backend ? [] : fixtureAnnouncements(tenantId),
);
const [source, setSource] = useState<"db" | "fixtures" | "error">(
  backend ? "db" : "fixtures",
);
```

ファイル先頭コメントから「DB 取得失敗時も fixtures へ退避」を削除。

- [ ] **Step 2: catch を空＋error にする**

```ts
} catch (err) {
  if (reqId !== requestIdRef.current) return;
  console.error("[useAnnouncements] fetch failed", err);
  setAnnouncements([]);
  setSource("error");
  setError(err instanceof Error ? err.message : "fetch failed");
}
```

成功時は `setSource("db")` + `setError(null)`。デモ専用は現状どおり fixtures。

- [ ] **Step 3: 確認**

Run:
```bash
rg -n "fallback to fixtures|fixtureAnnouncements" apps/web/src/hooks/useAnnouncements.ts
```
Expected: `fixtureAnnouncements` はデモ専用パスのみ。catch に fixtures なし。

Run: `bun run typecheck` → PASS

- [ ] **Step 4: （ユーザー指示時のみ）Commit**

```bash
git add apps/web/src/hooks/useAnnouncements.ts
git commit -m "$(cat <<'EOF'
fix(web): stop falling back to announcement fixtures when API fails

EOF
)"
```

---

### Task 3: InstructorDashboard — デモ KPI をデモ専用に閉じ込める

**Files:**
- Modify: `apps/web/src/components/instructor/InstructorDashboard.tsx`

**Interfaces:**
- Consumes: `backendEnabled`, `useInstructorOverview`
- Produces: `backendEnabled` 時は overview null → KPI 0 / 空リスト

- [ ] **Step 1: フォールバック式を分岐に置き換える**

```ts
const openQuestions = overview
  ? overview.open_questions
  : backendEnabled
    ? 0
    : 3;
const overdueLearners = overview
  ? overview.overdue_learners
  : backendEnabled
    ? 0
    : 4;
const totalLearners = overview
  ? overview.total_learners
  : backendEnabled
    ? 0
    : 42;

const students: StudentRow[] = overview
  ? overview.students.map((s) => {
      const sv = severityOf(s);
      return {
        id: s.user_id,
        n: s.display_name,
        c: toneFromId(s.user_id),
        p: s.progress_pct,
        course: s.course_title,
        s: sv.label,
        sev: sv.sev,
      };
    })
  : backendEnabled
    ? []
    : STUDENT_PROG_DEMO;

const unanswered: UnansweredRow[] = overview
  ? openThreads.slice(0, 3).map((q) => ({
      id: q.id,
      q: q.title,
      who: q.author_name,
      c: toneFromId(q.author_id),
      t: relativeTime(q.created_at),
    }))
  : backendEnabled
    ? []
    : UNANSWERED_DEMO;
```

コメント「fixtures フォールバック」を「デモ専用のみデモ定数」に更新。`STUDENT_PROG_DEMO` / `UNANSWERED_DEMO` 定数定義は残す（デモ専用で使用）。

- [ ] **Step 2: 確認**

Run:
```bash
rg -n "overview \\? overview\\.|STUDENT_PROG_DEMO|UNANSWERED_DEMO" apps/web/src/components/instructor/InstructorDashboard.tsx
```
Expected: デモ定数の参照が `backendEnabled ? [] : DEMO` 形になっていること。

Run: `bun run typecheck` → PASS

- [ ] **Step 3: （ユーザー指示時のみ）Commit**

```bash
git add apps/web/src/components/instructor/InstructorDashboard.tsx
git commit -m "$(cat <<'EOF'
fix(web): hide instructor demo KPIs when backend is configured

EOF
)"
```

---

### Task 4: DataSource バナーとエラー UI

**Files:**
- Create: `apps/web/src/components/shell/DataSourceBanner.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/learner/LearnerDashboard.tsx`
- Modify: `apps/web/src/App.tsx` の `renderPage` / LearnerDashboard 呼び出し（courses error を渡すなら）

**Interfaces:**
- Produces:
  ```ts
  // DataSourceBanner.tsx
  export type DataSourceKind = "db" | "fixtures" | "error";
  export function DataSourceBanner(props: { source: DataSourceKind }): JSX.Element | null
  ```
- App が `browseCourses` / `enrolledCourses` / announcements の source を集約  
  ※ announcements は LearnerDashboard 内で取得しているため、バナー用に App でも `useAnnouncements(effectiveTenant.id, effectiveRole === 'learner')` を呼ぶか、LearnerDashboard から上げる。**採用: App で `useAnnouncements` を呼び、result を LearnerDashboard に props で渡す**（二重 fetch 回避）。

- [ ] **Step 1: `DataSourceBanner` を追加**

```tsx
export type DataSourceKind = "db" | "fixtures" | "error";

const LABEL: Record<DataSourceKind, string> = {
  db: "Data: db",
  fixtures: "Data: fixtures (demo)",
  error: "Data: error",
};

export function DataSourceBanner({ source }: { source: DataSourceKind }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div
      role="status"
      className="px-7 py-1 text-[11px] font-mono border-b border-border bg-muted/40 text-muted-foreground"
    >
      {LABEL[source]}
    </div>
  );
}
```

- [ ] **Step 2: App で source 集約とバナー表示**

`App.tsx`（アプリ本体表示ブロック）で:

```ts
const announcements = useAnnouncements(
  effectiveTenant.id,
  effectiveRole === "learner",
);

const courseSource =
  effectiveRole === "learner" ? enrolledCourses.source : browseCourses.source;
const courseError =
  effectiveRole === "learner" ? enrolledCourses.error : browseCourses.error;

function pickSource(
  ...sources: Array<"db" | "fixtures" | "error">
): "db" | "fixtures" | "error" {
  if (sources.includes("error")) return "error";
  if (sources.includes("fixtures")) return "fixtures";
  return "db";
}

const dataSource = pickSource(courseSource, announcements.source);
```

`Topbar` の直前（または直上）に:

```tsx
{import.meta.env.DEV ? <DataSourceBanner source={dataSource} /> : null}
```

`renderPage` / LearnerDashboard に `announcements` 一式と `coursesError` を渡す:

```tsx
// LearnerDashboard props 拡張例
announcementsHook: UseAnnouncementsResult;
coursesError: string | null;
```

既存の LearnerDashboard 内 `useAnnouncements` 呼び出しは削除し、props を使う。

- [ ] **Step 3: LearnerDashboard にエラー表示**

お知らせセクション付近（または PageHeader 直下）に:

```tsx
{coursesError ? (
  <p className="text-sm text-destructive mb-3">
    コースの取得に失敗しました: {coursesError}
  </p>
) : null}
{announcements.error ? (
  <p className="text-sm text-destructive mb-3">
    お知らせの取得に失敗しました: {announcements.error}
  </p>
) : null}
```

再試行ボタンは announcements に `refetch` があるので任意で 1 つ付けてよい:

```tsx
{announcements.error ? (
  <Button variant="outline" size="sm" onClick={() => void announcements.refetch()}>
    再試行
  </Button>
) : null}
```

- [ ] **Step 4: 確認**

Run: `bun run typecheck` → PASS

Run:
```bash
rg -n "DataSourceBanner|Data: " apps/web/src
```
Expected: バナーコンポーネントと App からの利用があること。

- [ ] **Step 5: （ユーザー指示時のみ）Commit**

```bash
git add apps/web/src/components/shell/DataSourceBanner.tsx apps/web/src/App.tsx apps/web/src/components/learner/LearnerDashboard.tsx
git commit -m "$(cat <<'EOF'
feat(web): show DEV data-source banner and API error states

EOF
)"
```

---

### Task 5: seed 冪等化 + 最小検証シナリオ + README

**Files:**
- Modify: `packages/shared/scripts/export-seed-sql.ts`
- Modify: `README.md`（DB 初期化節付近）

**Interfaces:**
- Produces: 決定論的 UUID ヘルパーとシナリオ emit。`db:seed` 経路は変更なし。

- [ ] **Step 1: 決定論的 UUID に置き換える**

`export-seed-sql.ts` 先頭付近:

```ts
import { createHash } from "node:crypto";

/** 名前空間キーから安定した UUID 文字列を作る（再 seed で ID がずれないようにする）。 */
function stableUuid(key: string): string {
  const h = createHash("sha1").update(key).digest();
  const bytes = Uint8Array.from(h.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5-ish
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

乱数 `uuid()` を削除し、呼び出しを置き換え:

```ts
const courseUuid = stableUuid(`course:${tenantId}:${course.id}`);
const sectionUuid = stableUuid(`section:${tenantId}:${course.id}:${section.id}`);
const lessonUuid = stableUuid(`lesson:${tenantId}:${course.id}:${section.id}:${lesson.id}`);
```

`emitCourse` / `emitLesson` のシグネチャに合わせてキーを渡す（`emitLesson` に tenantId / courseId / sectionId が必要なら引数追加）。

- [ ] **Step 2: 最小シナリオを emit**

コース emit の後、SQLite / Postgres 両方言で:

```ts
const SEED_ADMIN = "seed-admin";
const SEED_INSTRUCTOR = "seed-instructor";
const SEED_LEARNER = "seed-learner";
const SEED_ENROLLMENT = "seed-enrollment-learner-web-fundamentals";
const SEED_SUBMISSION = "seed-submission-pending-1";
const webFundCourseId = stableUuid("course:ses:web-fundamentals");
const webFundLessonId = stableUuid("lesson:ses:web-fundamentals:s3:l10");

// profiles (ses)
for (const p of [
  { id: SEED_ADMIN, role: "admin", name: "Seed Admin", initials: "SA", email: "seed-admin@example.local" },
  { id: SEED_INSTRUCTOR, role: "instructor", name: "Seed Instructor", initials: "SI", email: "seed-instructor@example.local" },
  { id: SEED_LEARNER, role: "student", name: "Seed Learner", initials: "SL", email: "seed-learner@example.local" },
]) {
  lines.push(
    isSqlite
      ? `insert into profiles (id, tenant_id, role, display_name, initials, email, disabled, created_at) values ('${p.id}', 'ses', '${p.role}', '${esc(p.name)}', '${p.initials}', '${p.email}', 0, ${nowExpr()}) on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, initials = excluded.initials, email = excluded.email;`
      : `insert into public.profiles (...) values (...) on conflict (id) do update set ...;`,
  );
}

// enrollment
lines.push(
  `insert into ${isSqlite ? "" : "public."}enrollments (id, tenant_id, user_id, course_id, assigned_by, due_at, required, status, enrolled_at, completed_at) values ('${SEED_ENROLLMENT}', 'ses', '${SEED_LEARNER}', '${webFundCourseId}', '${SEED_INSTRUCTOR}', null, 1, 'active', ${nowExpr()}, null) on conflict (user_id, course_id) do update set status = excluded.status, required = excluded.required;`,
);

// submission (pending) — assignment は shared にあるもの
lines.push(
  `insert into ${isSqlite ? "" : "public."}submissions (id, tenant_id, student_id, lesson_id, assignment_id, course_title, section_title, assignment_title, code, status, priority, attempt, ai_ready, ai_suggestions, rubric, review_notes, verdict, submitted_at, reviewed_at, reviewer_id) values ('${SEED_SUBMISSION}', 'ses', '${SEED_LEARNER}', '${webFundLessonId}', 'S0-Ch00-01-print-hello', 'Web開発基礎 — HTML / CSS / JavaScript', '03. JavaScript 基礎', 'print-hello', ${strLit("print('hello')\\n")}, 'pending', 'normal', 1, 0, '[]', '[]', '', null, ${nowExpr()}, null, null) on conflict (id) do update set code = excluded.code, status = excluded.status, student_id = excluded.student_id;`,
);
```

Postgres 分岐も同じ列で書く（既存の `isSqlite` パターンに合わせる）。SQLite の `on conflict (user_id, course_id)` は UNIQUE INDEX 名ではなく列で動く。

- [ ] **Step 3: seed を 2 回実行して冪等性を確認**

Run:
```bash
bun run db:migrate
bun run db:seed
bun run db:seed
```

Expected: 2 回目も成功（エラーなし）。

Run（course ID 安定の確認）:
```bash
cd apps/api && bunx wrangler d1 execute falcon-db --local --command="select id, slug from courses where tenant_id='ses' and slug='web-fundamentals';"
```
Expected: 1 行。ID が `stableUuid('course:ses:web-fundamentals')` と一致（スクリプトで一度印字して比較してよい）。

Run:
```bash
cd apps/api && bunx wrangler d1 execute falcon-db --local --command="select id, role, display_name from profiles where id like 'seed-%' order by id;"
```
Expected: 3 行（admin / instructor / learner）。

Run:
```bash
cd apps/api && bunx wrangler d1 execute falcon-db --local --command="select id, status, assignment_title from submissions where id='seed-submission-pending-1';"
```
Expected: 1 行、`pending`。

- [ ] **Step 4: README に一文追加**

`### DB 初期化` の seed 説明付近に:

```markdown
seed に含まれる `seed-admin` / `seed-instructor` / `seed-learner` はキューや一覧確認用の固定ユーザーです。Google ログインした本人とは別です。自分のアカウントのロール昇格は下記「初回ログインとロール昇格」を参照してください。
```

- [ ] **Step 5: typecheck**

Run: `bun run typecheck` → PASS

- [ ] **Step 6: （ユーザー指示時のみ）Commit**

```bash
git add packages/shared/scripts/export-seed-sql.ts README.md
git commit -m "$(cat <<'EOF'
fix(seed): make D1 seed idempotent and add minimal scenario users

EOF
)"
```

---

### Task 6: 仕上げ検証（Issue 完了条件）

**Files:** 変更なし（確認のみ）

- [ ] **Step 1: 沈黙フォールバックが残っていないこと**

Run:
```bash
rg -n "fallback to fixtures" apps/web/src
```
Expected: マッチなし（またはコメントのみで実行パスに無し）。

- [ ] **Step 2: typecheck**

Run: `bun run typecheck` → PASS

- [ ] **Step 3: 人手確認チェックリストを README / PR 用に残す**

- [ ] `VITE_SERVER_URL` 設定 + API 起動 → バナー `Data: db`
- [ ] API 停止後リロード → バナー `Data: error`、コース／お知らせが fixtures に化けない
- [ ] URL 未設定のデモ起動 → バナー `Data: fixtures (demo)`、Tweaks 利用可
- [ ] seed 提出が講師 ReviewQueue に見える（instructor 昇格後）

- [ ] **Step 4: （ユーザー指示時のみ）一括または残差分 Commit / PR**

設計ドキュメントも未コミットなら含める:

```bash
git add docs/superpowers/specs/2026-08-02-fixtures-fallback-removal-design.md docs/superpowers/plans/2026-08-02-fixtures-fallback-removal.md
```

---

## Self-review（プラン著者）

1. **Spec coverage:** UI フォールバック廃止・バナー・Instructor デモ閉じ込め・seed 冪等・最小シナリオ・README 注記・完了条件検証 → Task 1–6 で対応。
2. **Placeholder scan:** TBD / 「適切に」なし。コード片は具体。
3. **Type consistency:** `source: "db" | "fixtures" | "error"` を courses / announcements / banner で統一。
4. **Repo constraints:** 自動テスト無しのため typecheck + seed SQL 確認 + 手動リストで代替。
