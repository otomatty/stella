# コア学習ループ端到端（#61）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1 人の学習者が実データで「提出 → 講師レビュー確定 → 結果閲覧 → 完了判定」まで完走でき、#9 の学習者結果 UX も閉じる。

**Architecture:** 既存 Hono/D1 と web ストアの局所拡張。提出 PATCH を await 化し、`GET /mine` / `GET /:id` と `ReviewResultView` で学習者ループを閉じる。クイズは enrollment ゲート、教材パスは `tenant/ses/courses/{uuid}/...` に寄せる。新 Provider は作らない。

**Tech Stack:** React 19 + Vite (`apps/web`)、Hono + Drizzle + D1 (`apps/api`)、`@stella/shared` review/cms types、Bun

## Global Constraints

- 仕様: `docs/superpowers/specs/2026-08-02-core-learning-loop-design.md`
- 実データモード = `isBackendConfigured()` true → API のみ。失敗はエラー／空。fixtures 退避禁止（#60）
- デモ専用 = `VITE_SERVER_URL` 未設定 → fixtures / localStorage 維持可
- メール通知は作らない。アプリ内 `review_completed` のみ
- 独立 `inlineComments` カラムは追加しない（行コメントは `aiSuggestions`）
- R2 実ファイルの自動配置はしない（パス文字列統一のみ）
- 自動テストフレームワークなし → 検証は `bun run typecheck` + 手動確認
- コミットはユーザーが明示したときだけ行う（ユーザー規則）。プラン内の Commit ステップはステージング候補提示までとし、指示なしでは `git commit` しない
- #61 完了時に #9 もクローズできる状態にする

---

## ファイル構成

| ファイル | 役割 | 操作 |
|---------|------|------|
| `apps/api/src/routes/submissions.ts` | `mine` / `:id` GET、既存 POST/PATCH | 変更 |
| `apps/api/src/routes/quiz.ts` | enrollment 付き認可 | 変更 |
| `apps/web/src/lib/submissions-api.ts` | `fetchMySubmissions` / `fetchSubmissionById` | 変更 |
| `apps/web/src/lib/submissions-store.ts` | await PATCH / finalize | 変更 |
| `apps/web/src/hooks/useSubmissions.ts` | async `update` / `finalize` | 変更 |
| `apps/web/src/hooks/useMySubmissions.ts` | 学習者提出履歴フック | 新規 |
| `apps/web/src/components/instructor/ReviewEditor.tsx` | await finalize + 文言 | 変更 |
| `apps/web/src/components/learner/ReviewResultView.tsx` | 添削結果表示 | 新規 |
| `apps/web/src/components/learner/LearnerDashboard.tsx` | 提出・添削セクション | 変更 |
| `apps/web/src/components/learner/CourseDetail.tsx` | reviewed バッジ（最小） | 変更 |
| `apps/web/src/components/shell/NotificationCenter.tsx` | ディープリンク | 変更 |
| `apps/web/src/components/shell/Topbar.tsx` | 通知コールバック配線（必要なら） | 変更 |
| `apps/web/src/App.tsx` | `submission-result` page + 通知遷移 | 変更 |
| `apps/web/src/data/fixtures.ts` | 教材パスを `tenant/ses/courses/{uuid}/...` に | 変更 |
| `README.md` | 手動 E2E チェックリスト | 変更 |

`export-seed-sql.ts` は fixtures を読むため、fixtures 変更後に `bun run db:seed` で反映（スクリプト本体のパスハードコード変更は不要）。

---

### Task 1: Review finalize をサーバ確定待ちにする

**Files:**
- Modify: `apps/web/src/lib/submissions-store.ts`
- Modify: `apps/web/src/hooks/useSubmissions.ts`
- Modify: `apps/web/src/components/instructor/ReviewEditor.tsx`

**Interfaces:**
- Consumes: 既存 `patchSubmission(id, patch): Promise<Submission>`
- Produces:
  ```ts
  // submissions-store.ts
  export async function updateSubmission(
    tenantId: Tenant["id"],
    id: string,
    patch: Partial<Submission>,
  ): Promise<Submission | undefined>;

  export async function finalizeReview(
    tenantId: Tenant["id"],
    id: string,
    verdict: ReviewVerdict,
    patch: {
      reviewNotes: string;
      aiSuggestions: Submission["aiSuggestions"];
      rubric: Submission["rubric"];
    },
  ): Promise<Submission | undefined>;

  // useSubmissions
  update: (id: string, patch: Partial<Submission>) => Promise<Submission | undefined>;
  finalize: (
    id: string,
    verdict: ReviewVerdict,
    patch: { reviewNotes: string; aiSuggestions: Submission["aiSuggestions"]; rubric: Submission["rubric"] },
  ) => Promise<Submission | undefined>;
  ```

- [ ] **Step 1: `persistRemotePatch` を await 可能な形にする**

`apps/web/src/lib/submissions-store.ts` の `persistRemotePatch` を `Promise` を返すように変更する。fire-and-forget の `void patchSubmission` をやめる。

```ts
async function persistRemotePatch(
  tenantId: Tenant["id"],
  id: string,
  patch: Partial<Submission>,
  rollback: Submission,
): Promise<Submission | undefined> {
  const nextGen = (remotePatchGen.get(id) ?? 0) + 1;
  remotePatchGen.set(id, nextGen);
  const apiPatch = toSubmissionPatch(patch);
  try {
    const saved = await patchSubmission(id, apiPatch);
    if (remotePatchGen.get(id) !== nextGen) return saved;
    const list = remoteList(tenantId);
    const idx = list.findIndex((s) => s.id === id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = saved;
      setRemoteList(tenantId, next);
    }
    return saved;
  } catch (err) {
    if (remotePatchGen.get(id) === nextGen) {
      console.error("[submissions-store] remote patch failed", err);
      const list = remoteList(tenantId);
      const idx = list.findIndex((s) => s.id === id);
      if (idx >= 0) {
        const next = [...list];
        next[idx] = rollback;
        setRemoteList(tenantId, next);
      }
    }
    return undefined;
  }
}
```

- [ ] **Step 2: `updateSubmission` / `finalizeReview` を async 化**

リモート分岐:

```ts
export async function updateSubmission(
  tenantId: Tenant["id"],
  id: string,
  patch: Partial<Submission>,
): Promise<Submission | undefined> {
  if (useRemotePersistence()) {
    const list = remoteList(tenantId);
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) return undefined;
    const before = list[idx]!;
    const updated = { ...before, ...patch };
    const next = list.map((s, i) => (i === idx ? updated : s));
    setRemoteList(tenantId, next);
    return persistRemotePatch(tenantId, id, patch, before);
  }
  // デモ: 既存の同期 localStorage 更新を維持し、値を Promise で返す
  // ... existing sync body, then:
  return updated; // or undefined
}
```

`finalizeReview` は `return updateSubmission(...)` のまま（async 伝播）。

ファイル先頭コメントの「楽観的更新 + 非同期永続化」を「実データは PATCH await、デモは localStorage」に更新。

- [ ] **Step 3: `useSubmissions` の `update` / `finalize` を Promise 返却に**

```ts
update: (id: string, patch: Partial<Submission>) =>
  updateSubmission(tenantId, id, patch),
finalize: (id, verdict, patch) =>
  finalizeReview(tenantId, id, verdict, patch),
```

呼び出し元で `await` できるよう、戻り型を `Promise<...>` にする（実装は上記 store に委譲）。

- [ ] **Step 4: `ReviewEditor.handleFinalize` を async 化 + 文言修正**

```ts
const handleFinalize = async (v: ReviewVerdict) => {
  const saved = await finalize(submission.id, v, {
    reviewNotes: notes,
    aiSuggestions: suggestions,
    rubric,
  });
  if (!saved) {
    toast.error('採点の保存に失敗しました');
    return;
  }
  setVerdict(v);
  const backend = isBackendConfigured();
  toast.success(
    v === 'pass'
      ? backend
        ? '合格として確定しました（LMS通知を送信しました）'
        : '合格として確定しました（デモ: 通知はローカルのみ）'
      : v === 'resubmit'
        ? backend
          ? '再提出を依頼しました（LMS通知を送信しました）'
          : '再提出を依頼しました'
        : backend
          ? '不合格として確定しました（LMS通知を送信しました）'
          : '不合格として確定しました',
  );
  setPage('review-queue');
};
```

Info バナー文言を次に置換:

```tsx
<div>
  {isBackendConfigured()
    ? '採点を確定すると受講者に LMS 通知が送られます（メールは送信しません）。'
    : '採点を確定するとローカルに保存されます（デモ）。'}
</div>
```

`isBackendConfigured` を `@/lib/backend` から import。確定ボタンに二重送信防止（`finalizing` state）を付ける:

```ts
const [finalizing, setFinalizing] = useState(false);
// handleFinalize 先頭: if (finalizing) return; setFinalizing(true);
// finally: setFinalizing(false);
```

- [ ] **Step 5: 型チェック**

Run: `bun run typecheck`  
Expected: PASS（`finalize` を同期前提で呼んでいる箇所があれば async に直す）

- [ ] **Step 6: ステージング候補を提示（コミットはユーザー指示後）**

```bash
git add apps/web/src/lib/submissions-store.ts \
  apps/web/src/hooks/useSubmissions.ts \
  apps/web/src/components/instructor/ReviewEditor.tsx
# ユーザー指示後:
# git commit -m "fix(web): await submission review finalize against API"
```

---

### Task 2: 学習者向け submissions API + client

**Files:**
- Modify: `apps/api/src/routes/submissions.ts`
- Modify: `apps/web/src/lib/submissions-api.ts`

**Interfaces:**
- Produces:
  ```ts
  // API
  // GET /api/submissions/mine → { rows: SubmissionRow[] }  // student_id = caller
  // GET /api/submissions/:id  → { row: SubmissionRow }     // owner or same-tenant staff

  // submissions-api.ts
  export async function fetchMySubmissions(): Promise<Submission[]>;
  export async function fetchSubmissionById(id: string): Promise<Submission>;
  ```

- [ ] **Step 1: `GET /api/submissions/mine` を追加**

`apps/api/src/routes/submissions.ts` で、既存の `GET /api/submissions` の**後**、`PATCH /:id` の**前**に登録する。`/:id` より先に `/mine` を置く。

```ts
import { and, desc, eq, inArray } from "drizzle-orm";

/** 受講者: 自分の提出一覧 (新着順)。 */
submissionsRoute.get("/api/submissions/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.tenantId, caller.tenantId),
          eq(submissions.studentId, caller.id),
        ),
      )
      .orderBy(desc(submissions.submittedAt));

    const profile = await profileFor(db, caller.id);
    return c.json({
      rows: rows.map((r) => toRow(r, profile)),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
```

- [ ] **Step 2: `GET /api/submissions/:id` を追加**

```ts
submissionsRoute.get("/api/submissions/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const id = c.req.param("id");
    const rows = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    const row = rows[0];
    if (!row) throw new ApiError("対象の提出が見つかりません", 404);
    if (row.tenantId !== caller.tenantId) {
      throw new ApiError("他テナントの提出は操作できません", 403);
    }
    const isStaff = caller.role === "instructor" || caller.role === "admin";
    const isOwner = row.studentId === caller.id;
    if (!isStaff && !isOwner) {
      throw new ApiError("この提出を閲覧する権限がありません", 403);
    }
    return c.json({ row: toRow(row, await profileFor(db, row.studentId)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
```

ファイル先頭コメントに「受講者は mine / 本人の :id を select 可」と追記。

- [ ] **Step 3: client 関数を追加**

`apps/web/src/lib/submissions-api.ts` に:

```ts
/** 受講者: 自分の提出一覧。 */
export async function fetchMySubmissions(): Promise<Submission[]> {
  const { rows } = await apiFetch<{ rows: SubmissionRow[] }>("/api/submissions/mine");
  return (rows ?? []).map(rowToSubmission);
}

/** 本人または staff: 提出 1 件。 */
export async function fetchSubmissionById(id: string): Promise<Submission> {
  const { row } = await apiFetch<{ row: SubmissionRow }>(
    `/api/submissions/${encodeURIComponent(id)}`,
  );
  return rowToSubmission(row);
}
```

先頭コメントの RLS 説明を「受講者: insert + mine/本人 select。staff: テナント一覧/更新」に更新。

- [ ] **Step 4: 型チェック**

Run: `bun run typecheck`  
Expected: PASS

- [ ] **Step 5: ステージング候補を提示（コミットはユーザー指示後）**

```bash
git add apps/api/src/routes/submissions.ts apps/web/src/lib/submissions-api.ts
# git commit -m "feat(api): add learner submission mine and by-id endpoints"
```

---

### Task 3: Learner 履歴 + ReviewResultView + 通知ディープリンク

**Files:**
- Create: `apps/web/src/hooks/useMySubmissions.ts`
- Create: `apps/web/src/components/learner/ReviewResultView.tsx`
- Modify: `apps/web/src/components/learner/LearnerDashboard.tsx`
- Modify: `apps/web/src/components/learner/CourseDetail.tsx`
- Modify: `apps/web/src/components/shell/NotificationCenter.tsx`
- Modify: `apps/web/src/App.tsx`（Topbar 配線含む）

**Interfaces:**
- Consumes: `fetchMySubmissions`, `fetchSubmissionById`（Task 2）
- Produces:
  ```ts
  // useMySubmissions.ts
  export function useMySubmissions(enabled: boolean): {
    submissions: Submission[];
    loading: boolean;
    error: string | null;
    reload: () => void;
  };

  // App page key
  // page === 'submission-result' + resultSubmissionId: string | null

  // NotificationCenterProps に追加:
  onOpenSubmission?: (submissionId: string) => void;
  ```

- [ ] **Step 1: `useMySubmissions` を作る**

```ts
import { useCallback, useEffect, useState } from "react";
import type { Submission } from "@stella/shared/review/types";
import { isBackendConfigured } from "@/lib/backend";
import { fetchMySubmissions } from "@/lib/submissions-api";

export function useMySubmissions(enabled: boolean) {
  const backend = isBackendConfigured();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(backend && enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled || !backend) {
      setSubmissions([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchMySubmissions()
      .then((rows) => {
        if (cancelled) return;
        setSubmissions(rows);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useMySubmissions] failed", err);
        setSubmissions([]);
        setError(err instanceof Error ? err.message : "提出履歴の取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, backend, tick]);

  return { submissions, loading, error, reload };
}
```

デモ専用（backend なし）では空配列。fixtures で埋めない。

- [ ] **Step 2: `ReviewResultView` を新規作成**

`apps/web/src/components/learner/ReviewResultView.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import type { Submission } from '@stella/shared/review/types';
import { Badge } from '@/components/ui/Badge';
import { fetchSubmissionById } from '@/lib/submissions-api';
import { formatSubmittedAt } from '@/lib/submissions-store';
import { isBackendConfigured } from '@/lib/backend';

interface Props {
  submissionId: string;
  setPage: (page: string) => void;
  /** 一覧から渡せる場合は初回表示を早くする */
  initial?: Submission | null;
}

export function ReviewResultView({ submissionId, setPage, initial = null }: Props) {
  const [submission, setSubmission] = useState<Submission | null>(initial);
  const [loading, setLoading] = useState(!initial && isBackendConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBackendConfigured()) {
      setError('バックエンド未設定のため提出詳細を表示できません');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchSubmissionById(submissionId)
      .then((row) => {
        if (!cancelled) {
          setSubmission(row);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSubmission(null);
          setError(err instanceof Error ? err.message : '提出の取得に失敗しました');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  // UI: 戻る / 課題タイトル / verdict Badge / reviewNotes /
  // rubric 一覧 (name, score/max) /
  // adopted !== false の aiSuggestions を行番号付きで表示 /
  // codeLines を <pre> read-only
  // loading / error の空状態を忘れない
}
```

Verdict ラベル: `pass` → 合格、`resubmit` → 再提出、`fail` → 不合格、`null` + `pending` → 添削待ち。  
既存 UI（Badge / 余白クラス）に合わせ、新規デザインシステムは導入しない。

- [ ] **Step 3: `App.tsx` に page と state を追加**

```ts
const [resultSubmissionId, setResultSubmissionId] = useState<string | null>(null);

const openSubmissionResult = (id: string) => {
  setResultSubmissionId(id);
  setPage('submission-result');
};
```

learner 分岐に:

```tsx
if (page === 'submission-result' && resultSubmissionId) {
  return (
    <ReviewResultView
      submissionId={resultSubmissionId}
      setPage={setPage}
    />
  );
}
```

`LearnerDashboard` / `CourseDetail` / `NotificationCenter` に `onOpenSubmission={openSubmissionResult}` を渡す。

- [ ] **Step 4: LearnerDashboard に提出・添削セクション**

`useMySubmissions(true)` を Dashboard 内（または App から props）で呼び、一覧を出す。

各行クリックで `onOpenSubmission(s.id)`。表示: `assignmentTitle`、`formatSubmittedAt(submittedAt)`、status/verdict。  
`error` があれば小さく表示。`loading` 中は「読み込み中…」。空なら「提出はまだありません」。

- [ ] **Step 5: CourseDetail に最小バッジ**

`useMySubmissions(true)` で、コースタイトル一致かつ `status !== 'pending'` の提出がある lesson / assignment に「添削済み」バッジ。クリックで `onOpenSubmission`。props 追加:

```ts
onOpenSubmission?: (submissionId: string) => void;
```

マッチキー: `assignmentId` があれば優先、なければ `assignmentTitle` + `courseTitle`。

- [ ] **Step 6: NotificationCenter ディープリンク**

props に `onOpenSubmission?: (submissionId: string) => void` を追加。通知行の onClick:

```ts
onClick={() => {
  if (!n.read) onMarkRead(n.id);
  if (n.type === 'review_completed' && onOpenSubmission) {
    const sid = n.payload?.submission_id;
    if (typeof sid === 'string' && sid.length > 0) {
      onOpenSubmission(sid);
      setOpen(false);
    }
  }
}}
```

Topbar / App から `onOpenSubmission` を渡す。

- [ ] **Step 7: 型チェック**

Run: `bun run typecheck`  
Expected: PASS

- [ ] **Step 8: ステージング候補を提示（コミットはユーザー指示後）**

```bash
git add apps/web/src/hooks/useMySubmissions.ts \
  apps/web/src/components/learner/ReviewResultView.tsx \
  apps/web/src/components/learner/LearnerDashboard.tsx \
  apps/web/src/components/learner/CourseDetail.tsx \
  apps/web/src/components/shell/NotificationCenter.tsx \
  apps/web/src/App.tsx
# git commit -m "feat(web): show learner submission history and review results"
```

---

### Task 4: クイズ認可を enrollment と整合

**Files:**
- Modify: `apps/api/src/routes/quiz.ts`

**Interfaces:**
- Consumes: `enrollments` table（`userId`, `courseId`, `status`）
- Produces: `isAuthorizedForLesson` が student に active enrollment を要求

- [ ] **Step 1: import を追加**

```ts
import { and, asc, eq } from "drizzle-orm";
import {
  courses,
  enrollments,
  lessons,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  sections,
} from "../db/schema.js";
```

- [ ] **Step 2: `isAuthorizedForLesson` を置き換え**

```ts
/**
 * lesson が caller の同テナントで、かつアクセス可かを判定する。
 * - staff: 同テナントなら可
 * - student: published かつ当該コースに active enrollment
 */
async function isAuthorizedForLesson(
  db: Db,
  caller: Caller,
  lessonId: string,
): Promise<boolean> {
  const isStaff = caller.role === "instructor" || caller.role === "admin";
  const rows = await db
    .select({
      status: courses.status,
      tenantId: courses.tenantId,
      courseId: courses.id,
    })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  const row = rows[0];
  if (!row) return false;
  if (row.tenantId !== caller.tenantId) return false;
  if (isStaff) return true;
  if (row.status !== "published") return false;

  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.courseId, row.courseId),
        eq(enrollments.status, "active"),
      ),
    )
    .limit(1);
  return enrolled.length > 0;
}
```

ファイル先頭コメントの「受講者は published コース配下のみ」を「published + active enrollment」に更新。

拒否時の応答は変更しない（GET → `{ quiz: null }`、POST → 403）。

- [ ] **Step 3: 型チェック**

Run: `bun run typecheck`  
Expected: PASS

- [ ] **Step 4: ステージング候補を提示（コミットはユーザー指示後）**

```bash
git add apps/api/src/routes/quiz.ts
# git commit -m "fix(api): require enrollment for learner quiz access"
```

---

### Task 5: fixtures / seed 教材パスを `tenant/...` に統一

**Files:**
- Modify: `apps/web/src/data/fixtures.ts`
- Modify: `README.md`（seed 教材パス注記を一文）

**Interfaces:**
- Produces: SES `web-fundamentals` のパスが次の形になること

```text
tenant/ses/courses/6b200629-c6af-5746-bf86-69718cfacf2f/01-http.pdf
tenant/ses/courses/6b200629-c6af-5746-bf86-69718cfacf2f/02-dns.mp4
tenant/ses/courses/6b200629-c6af-5746-bf86-69718cfacf2f/10-functions.mp4
```

（UUID は `stableUuid("course:ses:web-fundamentals")` = `6b200629-c6af-5746-bf86-69718cfacf2f`。実装時に `export-seed-sql` と同じ関数で再確認すること。）

- [ ] **Step 1: fixtures の 3 パスを置換**

`apps/web/src/data/fixtures.ts`:

```ts
const SES_WEB_FUNDAMENTALS_COURSE_UUID =
  '6b200629-c6af-5746-bf86-69718cfacf2f';
const SES_WEB_MATERIALS_PREFIX = `tenant/ses/courses/${SES_WEB_FUNDAMENTALS_COURSE_UUID}`;

// pdfPath / videoPath:
pdfPath: `${SES_WEB_MATERIALS_PREFIX}/01-http.pdf`,
videoPath: `${SES_WEB_MATERIALS_PREFIX}/02-dns.mp4`,
videoPath: `${SES_WEB_MATERIALS_PREFIX}/10-functions.mp4`,
```

定数は fixtures ファイル内の SES_COURSES 近傍に置く。COACH コースに path が無ければ触らない。

- [ ] **Step 2: seed 再生成で反映を確認**

Run:

```bash
bun run db:seed
```

Expected: エラーなく完了。生成 SQL または D1 上の `lessons.video_path` / `pdf_path` が `tenant/ses/courses/6b200629-.../` で始まる。

確認例:

```bash
# apps/api で local D1 を叩く既存手順に合わせる。例:
bunx wrangler d1 execute DB --local --command \
  "select pdf_path, video_path from lessons where pdf_path is not null or video_path is not null limit 10;"
```

（実際の wrangler コマンドが README / package.json と違う場合はリポジトリの既存 seed/smoke 手順に従う。）

- [ ] **Step 3: README に一文**

実データセットアップまたは R2 節の近くに:

> seed 教材パスは `tenant/ses/courses/{courseUuid}/...` 形式。オブジェクトが R2 に無いと再生は失敗する。Admin の教材アップロード、または同キーでの配置で確認する。

- [ ] **Step 4: 型チェック**

Run: `bun run typecheck`  
Expected: PASS

- [ ] **Step 5: ステージング候補を提示（コミットはユーザー指示後）**

```bash
git add apps/web/src/data/fixtures.ts README.md
# git commit -m "chore(seed): align fixture material paths with R2 tenant prefix"
```

---

### Task 6: 手動 E2E チェックリストを文書化

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: README に「コア学習ループ（#61）手動 E2E」節

- [ ] **Step 1: README にチェックリストを追加**

既存の手動検証チェックリストの近くに追加:

```markdown
### コア学習ループ（#61）手動 E2E

前提: `dev:api` + `dev`、Google ログイン、必要なら admin/instructor 昇格、受講登録済み。

- [ ] Admin がコースを公開し、教材を R2 にアップロードできる
- [ ] 学習者を受講登録できる（Admin 受講登録画面）
- [ ] 学習者がレッスン進捗・クイズ・課題提出を実行し、D1 に残る（再ログイン後も見える）
- [ ] 講師が ReviewQueue から添削確定でき、失敗時はエラートースト（成功時のみ「LMS通知」文言）
- [ ] 学習者 Dashboard / 通知から ReviewResultView で verdict・rubric・行コメント・要約が見える
- [ ] 未受講コースのクイズは受験できない
- [ ] API 停止時に courses / announcements が fixtures に化けない（#60）
- [ ] 別ブラウザ（またはシークレット）で再ログイン後も進捗・提出履歴が見える
```

- [ ] **Step 2: Issue 側メモ（任意だが推奨）**

```bash
gh issue comment 61 --body "$(cat <<'EOF'
## 手動 E2E

チェックリストを README「コア学習ループ（#61）手動 E2E」に追加済み。実装完了後に人手で消化する。
EOF
)"
```

- [ ] **Step 3: ステージング候補を提示（コミットはユーザー指示後）**

```bash
git add README.md
# git commit -m "docs: add core learning loop manual E2E checklist (#61)"
```

---

### Task 7: #9 / #61 受け入れ突合せ

**Files:**
- なし（検証と Issue コメント）

**Interfaces:**
- Consumes: 仕様の完了条件、#9 受け入れ条件

- [ ] **Step 1: 仕様チェックリストを突合**

`docs/superpowers/specs/2026-08-02-core-learning-loop-design.md` の完了条件と本プラン Task 1–6 を照合し、未実装が無いか確認する。

必須カバー:

| 項目 | Task |
|------|------|
| Review await + 文言 | 1 |
| mine / :id API | 2 |
| ReviewResultView + 通知リンク | 3 |
| Quiz enrollment | 4 |
| 教材パス | 5 |
| E2E 文書 | 6 |

- [ ] **Step 2: `bun run typecheck` を最終実行**

Expected: PASS

- [ ] **Step 3: Issue に完了報告コメント案を用意（クローズはユーザー確認後）**

```bash
gh issue comment 61 --body "$(cat <<'EOF'
## 実装完了（クローズ待ち）

- レビュー確定は PATCH await
- GET /api/submissions/mine と /:id
- 学習者 ReviewResultView + 通知ディープリンク
- クイズは active enrollment 必須
- seed/fixtures 教材パスを tenant/ses/courses/{uuid}/... に統一
- README に手動 E2E チェックリスト

#9 の提出→Queue→Editor→学習者結果も本変更でカバー。人手 E2E 後に #61 / #9 をクローズ予定。
EOF
)"
# ユーザー承認後:
# gh issue close 61 --comment "Phase 2 complete"
# gh issue close 9 --comment "Absorbed by #61"
```

---

## Self-review（プラン著者）

1. **Spec coverage:** 目標 1–7、API、Store、Learner UI、通知、クイズ、教材パス、E2E、#9 吸収 → Task 1–7 に割当済み。R2 自動配置・メール・#62 は非目標どおり除外。
2. **Placeholders:** TBD / 「適切に」なし。UUID とパス例を具体化。コミットはユーザー規則に合わせ「候補提示」に固定。
3. **Type consistency:** `fetchMySubmissions` / `fetchSubmissionById` / async `finalizeReview` / `onOpenSubmission` / page `submission-result` を Task 間で統一。
