# 認可・所属を固める（#62）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 招待制のみの所属、`platform_admin` / tenant `admin` 分離、短命 JWT、認証付き AI API により、多人数利用でもテナント境界とスタッフ権限が破られないようにする。

**Architecture:** 既存の `profiles` + `auth_users` 招待モデルを維持し、自由オンボーディングと org 横断の穴を閉じる。新テーブル（`invites` / denylist）は作らない。ロールと staff 判定は共有型 + `authz.ts` に集約する。

**Tech Stack:** Hono + Drizzle + D1 (`apps/api`)、React 19 + Vite (`apps/web`)、`@falcon/shared`、Vitest（`packages/**/*.test.ts`）、Bun

## Global Constraints

- 仕様: `docs/superpowers/specs/2026-08-03-authz-membership-design.md`
- 所属は招待制のみ（ドメイン制限なし）
- `platform_admin` は seed/SQL のみ付与。既存 `admin` は tenant-scoped のまま
- JWT TTL = 24h。denylist / refresh は作らない
- 招待メール送信はしない
- AI: `chat` = 認証済み全員、`review-draft` = instructor | admin | platform_admin
- 自動テストは Vitest（shared）+ `bun run typecheck` + 手動確認。API の Workers 結合テストは新設しない
- コミットはユーザーが明示したときだけ行う（ユーザー規則）。プラン内の Commit ステップはステージング候補提示までとし、指示なしでは `git commit` しない

---

## ファイル構成

| ファイル | 役割 | 操作 |
|---------|------|------|
| `packages/shared/src/cms/types.ts` | `ProfileRole` に `platform_admin` | 変更 |
| `packages/shared/src/admin/types.ts` | `ASSIGNABLE_PROFILE_ROLES` / `isAssignableProfileRole` / `isProfileRole` | 変更 |
| `packages/shared/src/admin/parse-invite-csv.ts` | 割当可能ロールのみ | 変更 |
| `packages/shared/src/admin/assignable-roles.test.ts` | ロール判定テスト | 新規 |
| `apps/api/src/db/schema.ts` | role enum + `profiles.email` unique | 変更 |
| `apps/api/drizzle/0002_*.sql` (+ meta) | migration | 新規（`db:generate`） |
| `apps/api/src/lib/authz.ts` | `ProfileRole` / `isStaffRole` / admin helpers | 変更 |
| `apps/api/src/lib/auth-jwt.ts` | TTL 24h | 変更 |
| `apps/api/src/lib/auth-users.ts` | 招待時の既存 auth_users 救済 | 変更 |
| `apps/api/src/routes/me.ts` | `invite_required`、POST 新規作成廃止 | 変更 |
| `apps/api/src/routes/admin.ts` | tenant admin / platform admin 分離、招待原子化 | 変更 |
| `apps/api/src/routes/chat.ts` | `getCaller` | 変更 |
| `apps/api/src/routes/review-draft.ts` | `getCaller` + staff | 変更 |
| `apps/api/src/routes/{cms,submissions,quiz,certificates,notifications,qa,enrollments,analytics,audit-logs,materials,lesson-progress}.ts` | staff に `platform_admin` | 変更 |
| `apps/web/src/hooks/useAuthSession.ts` | `inviteRequired` 状態 | 変更 |
| `apps/web/src/lib/auth.ts` | `fetchProfile` の invite 分岐 | 変更 |
| `apps/web/src/components/shell/InviteRequiredScreen.tsx` | 未招待 UI | 新規 |
| `apps/web/src/App.tsx` | Onboarding 置換、org ゲート、ロール表示 | 変更 |
| `apps/web/src/components/common/api.ts` | chat に Bearer | 変更 |
| `apps/web/src/lib/review-draft-api.ts` | Bearer + 401/403 は fallback しない | 変更 |
| `apps/web/src/components/admin/users-admin/shared.tsx` | ロールラベル | 変更 |
| `apps/web/src/components/admin/users-admin/InviteDialog.tsx` | 割当可能ロールのみ | 変更 |
| `apps/web/src/components/shell/Sidebar.tsx` | 組織マスタは platform_admin のみ | 変更 |
| `README.md` | 招待必須・platform_admin SQL・JWT 24h | 変更 |

---

### Task 1: 共有ロール型と割当可能ロール

**Files:**
- Modify: `packages/shared/src/cms/types.ts`
- Modify: `packages/shared/src/admin/types.ts`
- Modify: `packages/shared/src/admin/parse-invite-csv.ts`
- Create: `packages/shared/src/admin/assignable-roles.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // cms/types.ts
  export type ProfileRole = "student" | "instructor" | "admin" | "platform_admin";

  // admin/types.ts
  export const ASSIGNABLE_PROFILE_ROLES = ["student", "instructor", "admin"] as const;
  export type AssignableProfileRole = (typeof ASSIGNABLE_PROFILE_ROLES)[number];
  export function isProfileRole(value: unknown): value is ProfileRole;
  export function isAssignableProfileRole(value: unknown): value is AssignableProfileRole;
  ```

- [ ] **Step 1: 失敗するテストを書く**

`packages/shared/src/admin/assignable-roles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  isAssignableProfileRole,
  isProfileRole,
  validateInviteUsersRequest,
} from "./types.js";

describe("profile roles", () => {
  it("recognizes platform_admin as a profile role but not assignable", () => {
    expect(isProfileRole("platform_admin")).toBe(true);
    expect(isAssignableProfileRole("platform_admin")).toBe(false);
    expect(isAssignableProfileRole("admin")).toBe(true);
  });

  it("rejects platform_admin in invite validation", () => {
    const result = validateInviteUsersRequest({
      invites: [{ email: "a@example.com", displayName: "A", role: "platform_admin" }],
    });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `bun run test -- packages/shared/src/admin/assignable-roles.test.ts`  
Expected: FAIL（`platform_admin` / `isAssignableProfileRole` 未定義）

- [ ] **Step 3: 型と判定を実装**

`cms/types.ts` の `ProfileRole` に `"platform_admin"` を追加。

`admin/types.ts`:

```ts
export const PROFILE_ROLES: readonly ProfileRole[] = [
  "student",
  "instructor",
  "admin",
  "platform_admin",
];

export const ASSIGNABLE_PROFILE_ROLES = ["student", "instructor", "admin"] as const;
export type AssignableProfileRole = (typeof ASSIGNABLE_PROFILE_ROLES)[number];

export function isProfileRole(value: unknown): value is ProfileRole {
  return (
    value === "student" ||
    value === "instructor" ||
    value === "admin" ||
    value === "platform_admin"
  );
}

export function isAssignableProfileRole(value: unknown): value is AssignableProfileRole {
  return value === "student" || value === "instructor" || value === "admin";
}
```

`validateInviteUsersRequest` とロール変更用の検証で `isProfileRole(item.role)` を **`isAssignableProfileRole`** に置き換える（招待・UI ロール変更で `platform_admin` を拒否）。

`parse-invite-csv.ts` のエイリアス解決後も `isAssignableProfileRole` で弾く（`platform_admin` エイリアスは追加しない）。`InviteUserInput.role` は `AssignableProfileRole` に狭めてもよい。

- [ ] **Step 4: テスト成功を確認**

Run: `bun run test -- packages/shared/src/admin/assignable-roles.test.ts`  
Expected: PASS。既存 `parse-invite-csv.test.ts` も PASS。

- [ ] **Step 5: ステージング候補**

```bash
git add packages/shared/src/cms/types.ts packages/shared/src/admin/types.ts \
  packages/shared/src/admin/parse-invite-csv.ts \
  packages/shared/src/admin/assignable-roles.test.ts
# commit message candidate: feat(shared): add platform_admin and assignable roles
```

---

### Task 2: DB スキーマ — role 拡張と email UNIQUE

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle/0002_*.sql` (+ `meta/`) via generate

**Interfaces:**
- Consumes: Task 1 の `ProfileRole`
- Produces: Drizzle `profiles.role` enum に `platform_admin`、`profiles.email` に unique index

- [ ] **Step 1: schema を更新**

`apps/api/src/db/schema.ts` の `profiles`:

```ts
export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["student", "instructor", "admin", "platform_admin"],
    })
      .notNull()
      .default("student"),
    displayName: text("display_name").notNull(),
    initials: text("initials"),
    email: text("email"),
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: tsNow("created_at"),
  },
  (t) => ({
    emailUnique: uniqueIndex("profiles_email_uq").on(t.email),
  }),
);
```

（SQLite は UNIQUE で複数 NULL を許す。email 無し行があっても migration は通る。）

- [ ] **Step 2: ローカル重複を確認してから generate / migrate**

```bash
cd apps/api
wrangler d1 execute falcon-db --local --command \
  "select email, count(*) c from profiles where email is not null group by email having c > 1"
```

Expected: 0 行。重複があれば手で消してから進む。

```bash
bun run db:generate
bun run db:migrate
```

Expected: `0002_*.sql` が生成され、local D1 に適用される。生成 SQL に `platform_admin` と `profiles_email_uq` が含まれること。

- [ ] **Step 3: typecheck**

Run: `bun run typecheck`  
Expected: schema 起因のエラーなし（他タスク未着手のロール参照エラーは後続で解消）。

- [ ] **Step 4: ステージング候補**

```bash
git add apps/api/src/db/schema.ts apps/api/drizzle/
# commit message candidate: feat(api): add platform_admin role and profiles.email unique
```

---

### Task 3: authz ヘルパと JWT TTL

**Files:**
- Modify: `apps/api/src/lib/authz.ts`
- Modify: `apps/api/src/lib/auth-jwt.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProfileRole = "student" | "instructor" | "admin" | "platform_admin";
  export function isStaffRole(role: ProfileRole): boolean;
  export function requireTenantAdmin(caller: Caller): void; // admin | platform_admin
  export function requirePlatformAdmin(caller: Caller): void;
  // TTL_SEC = 60 * 60 * 24
  ```

- [ ] **Step 1: `authz.ts` を更新**

`ProfileRole` を shared と一致させる（api 内の重複型を更新）。ヘルパ追加:

```ts
export function isStaffRole(role: ProfileRole): boolean {
  return role === "instructor" || role === "admin" || role === "platform_admin";
}

export function requireTenantAdmin(caller: Caller): void {
  requireRole(caller, "admin", "platform_admin");
}

export function requirePlatformAdmin(caller: Caller): void {
  requireRole(caller, "platform_admin");
}
```

- [ ] **Step 2: JWT TTL を 24h に**

`apps/api/src/lib/auth-jwt.ts`:

```ts
const TTL_SEC = 60 * 60 * 24; // 24 時間
```

コメントも「7 日」→「24 時間」に更新。

- [ ] **Step 3: typecheck（当該ファイル）**

Run: `bun run --filter=@falcon/api typecheck`  
Expected: PASS（または後続未変更箇所のみ）。

- [ ] **Step 4: ステージング候補**

```bash
git add apps/api/src/lib/authz.ts apps/api/src/lib/auth-jwt.ts
# commit message candidate: feat(api): staff helpers and 24h JWT TTL
```

---

### Task 4: `/api/me` を招待必須にする

**Files:**
- Modify: `apps/api/src/routes/me.ts`

**Interfaces:**
- Produces:
  - `GET /api/me` — profile なし → `403` + `{ error: "invite_required" }`
  - `POST /api/me` — profile なし → 同上。あり → display_name / initials / email のみ更新

- [ ] **Step 1: GET を変更**

```ts
meRoute.get("/api/me", async (c) => {
  try {
    const payload = await verifyToken(c);
    const db = getDb(c.env);
    const rows = await db
      .select(PROFILE_COLS)
      .from(profiles)
      .where(eq(profiles.id, payload.sub as string))
      .limit(1);
    if (!rows[0]) {
      throw new ApiError("invite_required", 403);
    }
    return c.json({ profile: rows[0] });
  } catch (err) {
    return errorResponse(c, err);
  }
});
```

`ApiError` を `me.ts` で import。

- [ ] **Step 2: POST の insert を廃止**

```ts
meRoute.post("/api/me", async (c) => {
  try {
    const payload = await verifyToken(c);
    const userId = payload.sub as string;
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const db = getDb(c.env);
    const body = (await c.req.json()) as {
      display_name?: string;
      email?: string;
      initials?: string;
    };

    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (!existing[0]) {
      throw new ApiError("invite_required", 403);
    }

    const displayName = body.display_name?.trim() || email || "User";
    const initials = body.initials ?? displayName.slice(0, 2).toUpperCase();

    await db
      .update(profiles)
      .set({
        displayName,
        initials,
        email: body.email ?? email ?? null,
      })
      .where(eq(profiles.id, userId));

    const rows = await db
      .select(PROFILE_COLS)
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    return c.json({ profile: rows[0] ?? null });
  } catch (err) {
    return errorResponse(c, err);
  }
});
```

ファイル先頭コメントも「作成」→「自己更新のみ / 未招待は invite_required」に直す。

- [ ] **Step 3: 手動スモーク（API 起動時）**

未招待トークンで `GET /api/me` → 403 / `invite_required`。招待済み → 200 + profile。

- [ ] **Step 4: ステージング候補**

```bash
git add apps/api/src/routes/me.ts
# commit message candidate: feat(api): require invite for /api/me profile access
```

---

### Task 5: 招待の原子化と login-before-invite 救済

**Files:**
- Modify: `apps/api/src/lib/auth-users.ts`
- Modify: `apps/api/src/routes/admin.ts`（invite ハンドラ）

**Interfaces:**
- Consumes: Task 1 の `isAssignableProfileRole`（validate 経由）
- Produces:
  ```ts
  // auth-users.ts
  export async function resolveInviteAuthUserId(
    db: Db,
    email: string,
  ): Promise<{ userId: string; authExists: boolean }>;
  ```

- [ ] **Step 1: 既存 auth_users 解決ヘルパ**

```ts
export async function resolveInviteAuthUserId(
  db: Db,
  email: string,
): Promise<{ userId: string; authExists: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = (
    await db.select().from(authUsers).where(eq(authUsers.email, normalized)).limit(1)
  )[0];
  if (existing) {
    return { userId: existing.id, authExists: true };
  }
  return { userId: crypto.randomUUID(), authExists: false };
}
```

`registerInvitedUser` は `authExists === false` のときだけ呼ぶ（既存行への二重 insert を避ける）。

- [ ] **Step 2: invite ループを書き換え**

`admin.ts` の各招待で:

1. email は validate 済みで lower/trim 済み
2. 既存 profile（email）チェックは現状維持
3. `const { userId, authExists } = await resolveInviteAuthUserId(db, inv.email)`
4. もし `authExists` かつ **別 id の profile が既にある**ケースは既存チェックで弾かれている想定。同じ id に profile が既にあればスキップ済み
5. D1 batch で原子的に作成:

```ts
const profileInsert = db.insert(profiles).values({
  id: userId,
  tenantId: caller.tenantId,
  role: inv.role,
  displayName: inv.displayName,
  initials: initialsFrom(inv.displayName),
  email: inv.email,
});

if (authExists) {
  await profileInsert;
} else {
  await db.batch([
    profileInsert,
    db.insert(authUsers).values({ id: userId, email: inv.email }),
  ]);
}
```

（Drizzle D1 の `db.batch` シグネチャに合わせる。型エラーなら同等の batch API を使う。）

失敗時はその行だけ `results` に error。orphan profile を残さない。

- [ ] **Step 3: `requireAdmin` を tenant admin 向けに**

ユーザー系エンドポイント用（authz の関数と名前が被らないよう ctx ヘルパ名を分ける）:

```ts
async function requireTenantAdminCtx(
  c: Context<{ Bindings: Env }>,
): Promise<{ caller: Caller; db: Db }> {
  const { caller, db } = await getCaller(c);
  requireTenantAdmin(caller);
  return { caller, db };
}
```

`GET/POST users*` は `requireTenantAdminCtx`（`admin` | `platform_admin`）。  
`GET/POST orgs*` は次タスクで platform のみ。

ロール変更 API で `isAssignableProfileRole(body.role)` を使う（`isProfileRole` から置換）。

- [ ] **Step 4: ステージング候補**

```bash
git add apps/api/src/lib/auth-users.ts apps/api/src/routes/admin.ts
# commit message candidate: fix(api): atomic invites and login-before-invite binding
```

---

### Task 6: org API を platform_admin のみに

**Files:**
- Modify: `apps/api/src/routes/admin.ts`

**Interfaces:**
- Consumes: Task 3 の `requirePlatformAdmin`
- Produces: `GET/POST /api/admin/orgs*` は `platform_admin` のみ 200。tenant `admin` は 403

- [ ] **Step 1: org ハンドラのゲートを差し替え**

```ts
async function requirePlatformAdminCtx(c: Context<{ Bindings: Env }>) {
  const { caller, db } = await getCaller(c);
  requirePlatformAdmin(caller);
  return { caller, db };
}
```

`GET /api/admin/orgs` と `POST /api/admin/orgs/upsert` でこれを使う（旧 `requireAdmin` をやめる）。

- [ ] **Step 2: 手動確認ポイントをメモ**

tenant `admin` JWT で orgs → 403。`platform_admin` → 200。

- [ ] **Step 3: ステージング候補**

```bash
git add apps/api/src/routes/admin.ts
# commit message candidate: feat(api): restrict org APIs to platform_admin
```

---

### Task 7: 全 staff 判定に `platform_admin` を含める

**Files:**
- Modify: `apps/api/src/routes/cms.ts`（`isStaff`）
- Modify: `apps/api/src/routes/submissions.ts`
- Modify: `apps/api/src/routes/quiz.ts`
- Modify: `apps/api/src/routes/certificates.ts`
- Modify: `apps/api/src/routes/notifications.ts`
- Modify: `apps/api/src/routes/qa.ts`
- Modify: `apps/api/src/routes/enrollments.ts`
- Modify: `apps/api/src/routes/analytics.ts`
- Modify: `apps/api/src/routes/audit-logs.ts`
- Modify: `apps/api/src/routes/materials.ts`
- Modify: `apps/api/src/routes/lesson-progress.ts`

**Interfaces:**
- Consumes: `isStaffRole` / `requireRole(..., "instructor", "admin", "platform_admin")`

- [ ] **Step 1: 機械的置換**

パターン:

```ts
// before
caller.role === "instructor" || caller.role === "admin"
requireRole(caller, "instructor", "admin");

// after
isStaffRole(caller.role)
requireRole(caller, "instructor", "admin", "platform_admin");
```

`cms.ts` のローカル `isStaff` は `isStaffRole(caller.role)` に委譲するか削除して import に統一。

- [ ] **Step 2: typecheck**

Run: `bun run --filter=@falcon/api typecheck`  
Expected: PASS

- [ ] **Step 3: ステージング候補**

```bash
git add apps/api/src/routes/
# commit message candidate: feat(api): treat platform_admin as staff within tenant
```

---

### Task 8: AI エンドポイントに認可を付ける

**Files:**
- Modify: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/routes/review-draft.ts`

**Interfaces:**
- Produces: 未認証 → 401。student の review-draft → 403

- [ ] **Step 1: chat**

レート制限の直後（または前）に:

```ts
try {
  await getCaller(c);
} catch (err) {
  return errorResponse(c, err);
}
```

（chat は全認証済みロール可。caller の tenant は今は使わなくてよい。）

- [ ] **Step 2: review-draft**

```ts
try {
  const { caller } = await getCaller(c);
  if (!isStaffRole(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
} catch (err) {
  return errorResponse(c, err);
}
```

- [ ] **Step 3: ステージング候補**

```bash
git add apps/api/src/routes/chat.ts apps/api/src/routes/review-draft.ts
# commit message candidate: feat(api): require auth on chat and review-draft
```

---

### Task 9: Web — 未招待画面とオンボーディング廃止

**Files:**
- Modify: `apps/web/src/lib/auth.ts`
- Modify: `apps/web/src/hooks/useAuthSession.ts`
- Create: `apps/web/src/components/shell/InviteRequiredScreen.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces:
  ```ts
  // useAuthSession
  inviteRequired: boolean;

  // InviteRequiredScreen props
  { email: string; onSignOut: () => void }
  ```

- [ ] **Step 1: `fetchProfile` で invite を識別**

```ts
import { apiFetch, ApiClientError } from "./api-client";

export async function fetchProfile(_userId?: string): Promise<Profile | null> {
  if (!isAuthConfigured() || !getAccessToken()) return null;
  try {
    const { profile } = await apiFetch<{ profile: Profile }>("/api/me");
    return profile;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 403 && err.message === "invite_required") {
      throw err; // 上位で inviteRequired に
    }
    throw err;
  }
}
```

（`ensureProfile` はデモ以外から呼ばれなくなる。残すなら「自己更新のみ」とコメント。Onboarding からの呼び出しは削除。）

- [ ] **Step 2: `useAuthSession` に `inviteRequired`**

`invite_required` を catch したら `setInviteRequired(true)` / `setProfile(null)`。それ以外のエラーは従来どおり log + profile null（inviteRequired false）。セッション無しなら `inviteRequired` を false に戻す。

- [ ] **Step 3: `InviteRequiredScreen` を追加**

文言: 「招待が必要です。管理者に連絡してください。」メール表示 + 「ログアウト」ボタン（`signOut`）。テナント `<select>` は置かない。

- [ ] **Step 4: `App.tsx` の backend 分岐**

```tsx
if (inviteRequired) {
  return (
    <>
      <InviteRequiredScreen
        email={session.user.email}
        onSignOut={() => void signOut()}
      />
      <Toaster />
    </>
  );
}
// OnboardingScreen 分岐は backendEnabled 時は削除
```

デモ経路（`!backendEnabled`）の `TenantSelect` / モックログインはそのまま。

- [ ] **Step 5: ステージング候補**

```bash
git add apps/web/src/lib/auth.ts apps/web/src/hooks/useAuthSession.ts \
  apps/web/src/components/shell/InviteRequiredScreen.tsx apps/web/src/App.tsx
# commit message candidate: feat(web): replace free onboarding with invite-required gate
```

---

### Task 10: Web — AI クライアントに Bearer

**Files:**
- Modify: `apps/web/src/components/common/api.ts`
- Modify: `apps/web/src/lib/review-draft-api.ts`

**Interfaces:**
- Consumes: `getAccessToken()` from `auth-client`

- [ ] **Step 1: `streamChat`**

```ts
import { getAccessToken } from "@/lib/auth-client";

const headers: Record<string, string> = {
  "Content-Type": "application/json",
};
const token = getAccessToken();
if (token) headers.Authorization = `Bearer ${token}`;

const res = await fetch(`${SERVER_URL}/api/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify(body),
  signal: options.signal,
});
```

- [ ] **Step 2: `fetchReviewDraft`**

同様に Bearer を付与。`!res.ok` で status が 401/403 のときは heuristic fallback **せず** throw（または Error を再送出）。ネットワークエラーや 5xx のみ従来の heuristic fallback を維持してよい（サーバ認可をクライアントが迂回しないこと）。

```ts
if (!res.ok) {
  const errBody = await res.json().catch(() => ({}));
  const message =
    typeof errBody.error === "string" ? errBody.error : `HTTP ${res.status}`;
  if (res.status === 401 || res.status === 403) {
    throw new Error(message);
  }
  throw new Error(message); // catch で 5xx 等のみ fallback するならここで区別
}
```

実装方針:

```ts
try {
  // fetch + Bearer ...
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as { error?: string }));
    const message =
      typeof errBody.error === "string" ? errBody.error : `HTTP ${res.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return (await res.json()) as ReviewDraftResponse;
} catch (err) {
  const status = (err as { status?: number }).status;
  if (status === 401 || status === 403) throw err;
  console.warn("[fetchReviewDraft] fallback to heuristic", err);
  return buildHeuristicReviewDraft(req.code);
}
```

- [ ] **Step 3: ステージング候補**

```bash
git add apps/web/src/components/common/api.ts apps/web/src/lib/review-draft-api.ts
# commit message candidate: feat(web): send auth token to AI endpoints
```

---

### Task 11: Web — 管理 UI のロール / 組織ゲート

**Files:**
- Modify: `apps/web/src/components/admin/users-admin/shared.tsx`
- Modify: `apps/web/src/components/admin/users-admin/InviteDialog.tsx`（ロール `<select>`）
- Modify: `apps/web/src/components/shell/Sidebar.tsx`
- Modify: `apps/web/src/App.tsx`（`mapProfileRole` / `roleLabel` / orgs ページガード）

**Interfaces:**
- Consumes: `ASSIGNABLE_PROFILE_ROLES`、`profile.role === "platform_admin"`

- [ ] **Step 1: ラベル**

```ts
export const ROLE_LABEL: Record<ProfileRole, string> = {
  student: "受講者",
  instructor: "講師",
  admin: "管理者",
  platform_admin: "プラットフォーム管理",
};
```

Invite / ロール変更 UI の options は `ASSIGNABLE_PROFILE_ROLES` のみ。

- [ ] **Step 2: Sidebar の組織マスタ**

`admin` ナビ配列から `orgs` を常時出さず、`profileRole === "platform_admin"` のときだけ挿入する。そのため Sidebar に `profileRole?: ProfileRole`（または `canManageOrgs: boolean`）props を追加し、`App.tsx` から渡す。

- [ ] **Step 3: App の orgs ページ**

`page === "orgs"` かつ `profile?.role !== "platform_admin"` ならダッシュボードへ戻すか「権限がありません」を表示。

`mapProfileRole`: `platform_admin` → UI `admin`（既存シェル流用）。  
`roleLabel`: `profile.role === "platform_admin"` なら「プラットフォーム管理」。

- [ ] **Step 4: ステージング候補**

```bash
git add apps/web/src/components/admin/users-admin/shared.tsx \
  apps/web/src/components/admin/users-admin/InviteDialog.tsx \
  apps/web/src/components/shell/Sidebar.tsx apps/web/src/App.tsx
# commit message candidate: feat(web): gate org UI and hide platform_admin from assigns
```

---

### Task 12: README 更新と最終検証

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 「初回ログインとロール昇格」を書き換え**

要点:

1. 自由オンボーディングは廃止。先に tenant `admin`（または SQL）で自分の email を招待する
2. 開発ブートストラップ例（seed テナントへ SQL で profile + auth_users を作る、または既存 seed ユーザーではなく自分の email を招待する手順）
3. tenant `admin` 昇格 SQL（従来）に加え `platform_admin`:

```bash
wrangler d1 execute falcon-db --local --command \
  "update profiles set role='platform_admin' where email='you@example.com'"
```

4. JWT は 24 時間で失効 → 再ログイン
5. 手動チェックリストに #62 項目を追加:

```markdown
### 認可・所属（#62）手動確認

- [ ] 未招待 Google ログイン → 招待必要画面（任意テナントに入れない）
- [ ] 招待後ログイン → 正しい tenant/role
- [ ] tenant admin は組織マスタ不可 / platform_admin は可
- [ ] 未認証で /api/chat・/api/review-draft が 401
- [ ] student で review-draft が 403
```

- [ ] **Step 2: 最終ゲート**

```bash
bun run test
bun run typecheck
bun run build
```

Expected: すべて成功。

- [ ] **Step 3: ステージング候補**

```bash
git add README.md
# commit message candidate: docs: document invite-only auth and platform_admin (#62)
```

---

## Spec coverage（自己レビュー）

| 仕様要件 | タスク |
|----------|--------|
| 招待制のみ・自由テナント選択廃止 | Task 4, 9 |
| `platform_admin` 分離・既存 admin 据え置き | Task 1, 2, 6, 11, 12 |
| 招待 CSV → 初回ログイン紐付け確実化 | Task 2 (email unique), Task 5 |
| JWT 24h・denylist なし | Task 3, 12 |
| chat / review-draft 認可 | Task 8, 10 |
| staff 以外が review-draft 無制限不可 | Task 8, 10 |
| 非目標（メール・ドメイン・invites テーブル等） | 全タスクで触らない |

## 手動 E2E（実装完了後）

1. 未招待で Google ログイン → InviteRequiredScreen
2. 別の admin で CSV/単発招待 → 同一 email でログイン → 正しい tenant/role
3. 先に未招待ログインした email を後から招待 → 再ログインで入れる（救済）
4. tenant `admin` で組織マスタ API/UI 不可。SQL で `platform_admin` にすると org 可
5. Bearer 無しで chat/review-draft → 401。student トークンで review-draft → 403
