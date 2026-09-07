# PracticeWorkspace を VS Code 拡張で置き換える Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 受講者のコード演習をブラウザの PracticeWorkspace から VS Code 拡張へ移し、Web は使い始め（ログイン・動画・クイズ）専用にする。

**Architecture:** 拡張ホストが既存 LMS API を叩き、JWT はワンタイムの vscode-link で Web から受け取る。課題ファイルは `~/.falcon-informal/exercises/<assignmentId>/` に starter だけ展開する。採点は隠し WebView で現行 `@stella/code-runner` の `runGrading` を回し、クリアを `/api/lesson-progress` に書く。

**Tech Stack:** VS Code Extension API 1.96+、esbuild、Hono / D1、`@stella/shared`、`@stella/code-runner`、Bun workspaces。

**Spec:** `docs/superpowers/specs/2026-08-14-vscode-replace-practice-workspace-design.md`

## Global Constraints

- 拡張 ID は `falcon.informal`。URI は `vscode://falcon.informal/link` と `vscode://falcon.informal/lesson`
- JWT は `SecretStorage` キー `falcon.accessToken` のみ。settings / ディスクに書かない
- テスト定義・mutation・正解はディスクに書かない
- 拡張の API 呼び出しは拡張ホストの `fetch` のみ（WebView から API 禁止）
- 採点条件は現行 `evaluate()` と同じ（Lint error 0 + AST 充足 + 全テスト pass）
- 講師 `AssignmentEditor` の Editor / FileTabs / linter / `runGrading` プレビューは残す
- 拡張は実 API 必須。fixtures / デモモードは実装しない
- 新コース教材（HTML/CSS / Git）は書かない
- 各タスク末で、触ったワークスペースの `bun run typecheck` が通ること。API 変更時は該当 vitest も通す
- lint は Biome（`bun run lint`）
- コミットはユーザーが依頼したときだけ行う（この計画の Step「Commit」はステージ内容の確認まで）

---

## Wave 1 — 接続と目次

PracticeWorkspace はまだ残す。この波の終わりで、拡張にコース一覧とドキュメントが表示されればよい。

### Task 1: vscode-link の D1 テーブルと API

**Files:**
- Modify: `apps/api/src/db/schema.ts`（`auth_vscode_links` を `auth_otp_codes` の直後に追加）
- Create via drizzle: `apps/api/drizzle/0011_*.sql` と meta（`bun run db:generate` が名前を決める）
- Modify: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/lib/vscode-link.ts`
- Create: `apps/api/src/lib/vscode-link.test.ts`

**Interfaces:**
- Produces:
  - `createVscodeLinkCode(): string` — `A-Z2-9` から 8 文字。`I` `O` `0` `1` を除く
  - `hashVscodeLinkCode(code: string): Promise<string>` — SHA-256 hex
  - `POST /api/auth/vscode-link` → `{ code: string, expires_at: string }`（ISO）
  - `POST /api/auth/vscode-link/exchange` body `{ code: string }` → `{ access_token: string }`

- [ ] **Step 1: ハッシュとコード生成のテストを書く**

`apps/api/src/lib/vscode-link.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createVscodeLinkCode, hashVscodeLinkCode } from "./vscode-link.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

describe("createVscodeLinkCode", () => {
  it("returns 8 chars from the safe alphabet", () => {
    const code = createVscodeLinkCode();
    expect(code).toHaveLength(8);
    expect([...code].every((c) => ALPHABET.includes(c))).toBe(true);
  });

  it("does not emit I, O, 0, or 1", () => {
    for (let i = 0; i < 50; i++) {
      const code = createVscodeLinkCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });
});

describe("hashVscodeLinkCode", () => {
  it("is stable and hex-encoded sha-256", async () => {
    const a = await hashVscodeLinkCode("ABCD2345");
    const b = await hashVscodeLinkCode("ABCD2345");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different codes", async () => {
    const a = await hashVscodeLinkCode("ABCD2345");
    const b = await hashVscodeLinkCode("ABCD2346");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: テストを回して失敗を確認する**

Run: `bun run test apps/api/src/lib/vscode-link.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

`apps/api/src/lib/vscode-link.ts`:

```ts
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createVscodeLinkCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function hashVscodeLinkCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code.trim().toUpperCase()),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const VSCODE_LINK_TTL_MS = 5 * 60 * 1000;
```

`schema.ts` の `authOtpCodes` の直後:

```ts
export const authVscodeLinks = sqliteTable("auth_vscode_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  codeHash: text("code_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: tsNow("created_at"),
});
```

`auth.ts` に 2 ルートを追加する。`POST /api/auth/vscode-link` は `getCaller` 必須。行を insert し `{ code, expires_at }` を返す。`POST /api/auth/vscode-link/exchange` は caller 不要。hash で探し、`used_at` が null かつ `expires_at > now` のときだけ `used_at` を書いて `signAccessToken` する。見つからない / 期限切れ / 使用済みは 401 `{ error: "接続コードが無効です" }`。

- [ ] **Step 4: マイグレーションを生成し、テストと typecheck を通す**

```bash
bun run db:generate
bun run db:migrate
bun run test apps/api/src/lib/vscode-link.test.ts
bun run --filter=@stella/api typecheck
```

Expected: PASS。生成 SQL に `auth_vscode_links` がある。

---

### Task 2: Web の接続ページとディープリンクヘルパ

**Files:**
- Create: `apps/web/src/lib/vscode-link.ts`
- Create: `apps/web/src/lib/vscode-link.test.ts`
- Create: `apps/web/src/routes/_app/connect-vscode.tsx`
- Create: `apps/web/src/components/learner/ConnectVscodePage.tsx`
- Modify: `apps/web/src/components/shell/AppShell.tsx`（ナビに「VS Code」を学習者だけ出す。既存のコース一覧リンクの並びに合わせる）

**Interfaces:**
- Consumes: `POST /api/auth/vscode-link`
- Produces:
  - `VSCODE_EXT_ID = "falcon.informal"`
  - `buildVscodeLinkUri(code: string): string` → `vscode://falcon.informal/link?code=...`
  - `buildVscodeLessonUri(courseId: string, lessonId: string): string` → `vscode://falcon.informal/lesson?courseId=...&lessonId=...`

- [ ] **Step 1: URI ヘルパのテストを書く**

vitest は `packages/**/*.test.ts` が既定。Web のテストをルート vitest に載せるか、ヘルパを `packages/shared/src/vscode/uris.ts` に置く。後者にする。

Create: `packages/shared/src/vscode/uris.ts`
Create: `packages/shared/src/vscode/uris.test.ts`
Modify: `packages/shared/src/index.ts`（`export * from "./vscode/uris.js"`）

```ts
export const VSCODE_EXT_ID = "falcon.informal";

export function buildVscodeLinkUri(code: string): string {
  return `vscode://${VSCODE_EXT_ID}/link?code=${encodeURIComponent(code)}`;
}

export function buildVscodeLessonUri(courseId: string, lessonId: string): string {
  const q = new URLSearchParams({ courseId, lessonId });
  return `vscode://${VSCODE_EXT_ID}/lesson?${q.toString()}`;
}
```

Test:

```ts
import { describe, expect, it } from "vitest";
import { buildVscodeLessonUri, buildVscodeLinkUri } from "./uris.js";

describe("vscode uris", () => {
  it("builds a link uri", () => {
    expect(buildVscodeLinkUri("ABCD2345")).toBe(
      "vscode://falcon.informal/link?code=ABCD2345",
    );
  });

  it("builds a lesson uri", () => {
    expect(buildVscodeLessonUri("course-1", "lesson-1")).toBe(
      "vscode://falcon.informal/lesson?courseId=course-1&lessonId=lesson-1",
    );
  });
});
```

- [ ] **Step 2: テストを回す**

Run: `bun run test packages/shared/src/vscode/uris.test.ts`
Expected: 実装後 PASS

- [ ] **Step 3: `/connect-vscode` を足す**

`ConnectVscodePage` はログイン済み学習者向け。ボタン「VS Code に接続」で `apiFetch<{ code: string; expires_at: string }>("/api/auth/vscode-link", { method: "POST" })` し、`window.location.assign(buildVscodeLinkUri(code))` する。失敗は toast。説明文: 「拡張 FALCON INFORMAL を入れた VS Code が開きます。」

ルートは既存 `_app` layout 配下。`RoleGuard allow={['learner']}`。

- [ ] **Step 4: typecheck**

Run: `bun run --filter=@stella/web typecheck && bun run --filter=@stella/shared typecheck`
Expected: PASS

---

### Task 3: 拡張パッケージの足場

**Files:**
- Create: `apps/vscode/package.json`
- Create: `apps/vscode/tsconfig.json`
- Create: `apps/vscode/esbuild.mjs`
- Create: `apps/vscode/src/extension.ts`
- Create: `apps/vscode/src/auth.ts`
- Create: `apps/vscode/.vscodeignore`
- Modify: ルートの話は不要（`apps/*` で拾われる）
- Modify: `apps/vscode/package.json` の `contributes`

**Interfaces:**
- Produces: `activate(context)` がコマンド `falcon.connect` と URI handler を登録する。このタスクでは handler は `console` / `showInformationMessage` で code を表示するだけ

`apps/vscode/package.json` の必須フィールド:

```json
{
  "name": "@stella/vscode",
  "displayName": "FALCON INFORMAL",
  "publisher": "falcon",
  "version": "0.1.0",
  "private": true,
  "engines": { "vscode": "^1.96.0" },
  "main": "./dist/extension.js",
  "activationEvents": ["onUri", "onView:falcon.lessons"],
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "falcon",
          "title": "FALCON",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "falcon": [
        {
          "id": "falcon.lessons",
          "name": "カリキュラム"
        }
      ]
    },
    "commands": [
      { "command": "falcon.connect", "title": "FALCON: Web で接続" },
      { "command": "falcon.disconnect", "title": "FALCON: 切断" },
      { "command": "falcon.grade", "title": "FALCON: 採点を実行" },
      { "command": "falcon.resetExercise", "title": "FALCON: 課題をリセット" },
      { "command": "falcon.openInWeb", "title": "FALCON: Web で開く" }
    ],
    "configuration": {
      "properties": {
        "falcon.serverUrl": {
          "type": "string",
          "default": "http://127.0.0.1:8787"
        },
        "falcon.webUrl": {
          "type": "string",
          "default": "http://127.0.0.1:5173"
        }
      }
    }
  },
  "scripts": {
    "build": "node esbuild.mjs",
    "typecheck": "tsc --noEmit",
    "package": "bun run build && bunx @vscode/vsce package --no-dependencies"
  },
  "dependencies": {
    "@stella/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/vscode": "^1.96.0",
    "esbuild": "^0.25.0",
    "typescript": "^5.9.3"
  }
}
```

`esbuild.mjs` は `src/extension.ts` を CJS で `dist/extension.js` にバンドルする（VS Code 拡張ホスト向け）。`@stella/shared` は bundle する。`vscode` は external。

`activate` の最小:

```ts
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        if (uri.path === "/link" || uri.path === "link") {
          const code = new URLSearchParams(uri.query).get("code");
          void vscode.window.showInformationMessage(
            code ? `接続コードを受信: ${code}` : "接続コードがありません",
          );
        }
      },
    }),
    vscode.commands.registerCommand("falcon.connect", async () => {
      const web = vscode.workspace
        .getConfiguration("falcon")
        .get<string>("webUrl", "http://127.0.0.1:5173")
        .replace(/\/+$/, "");
      await vscode.env.openExternal(vscode.Uri.parse(`${web}/connect-vscode`));
    }),
  );
}

export function deactivate(): void {}
```

- [ ] **Step 1: 上記ファイルを作成する**
- [ ] **Step 2: `cd apps/vscode && bun install && bun run typecheck && bun run build`**
Expected: `dist/extension.js` ができる
- [ ] **Step 3: ルート `package.json` の `build` / `typecheck` が `@stella/*` フィルタなので、拡張の `name` が `@stella/vscode` なら自動で拾われる。ルート typecheck を一度回す**

Run: `bun run typecheck`
Expected: PASS

---

### Task 4: 拡張の認証（SecretStorage + exchange）

**Files:**
- Modify: `apps/vscode/src/auth.ts`
- Modify: `apps/vscode/src/extension.ts`
- Create: `apps/vscode/src/api.ts`
- Create: `packages/shared/src/vscode/auth-exchange.ts`（fetch を注入できる純関数）
- Create: `packages/shared/src/vscode/auth-exchange.test.ts`

**Interfaces:**
- Consumes: `POST /api/auth/vscode-link/exchange`
- Produces:
  - `exchangeVscodeLink(serverUrl: string, code: string, fetchFn: typeof fetch): Promise<string>`
  - `AuthStore.getToken(): Promise<string | null>`
  - `AuthStore.setToken(token: string): Promise<void>`
  - `AuthStore.clear(): Promise<void>`
  - `apiRequest<T>(path, init): Promise<T>` — `Authorization: Bearer` を付ける。401 なら token を消し `AuthExpiredError` を投げる

- [ ] **Step 1: exchange のテストを書く**

```ts
import { describe, expect, it, vi } from "vitest";
import { exchangeVscodeLink } from "./auth-exchange.js";

describe("exchangeVscodeLink", () => {
  it("returns access_token on 200", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "jwt-1" }), { status: 200 }),
    );
    const token = await exchangeVscodeLink("http://127.0.0.1:8787", "ABCD2345", fetchFn);
    expect(token).toBe("jwt-1");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/auth/vscode-link/exchange",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on 401", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ error: "接続コードが無効です" }), { status: 401 }),
    );
    await expect(
      exchangeVscodeLink("http://127.0.0.1:8787", "NOPE", fetchFn),
    ).rejects.toThrow(/無効/);
  });
});
```

- [ ] **Step 2: 実装してテストを通す**

Run: `bun run test packages/shared/src/vscode/auth-exchange.test.ts`
Expected: PASS

- [ ] **Step 3: 拡張の URI handler を本番実装に差し替える**

`/link` を受けたら `exchangeVscodeLink` → `context.secrets.store("falcon.accessToken", token)` → `showInformationMessage("FALCON に接続しました")` → ツリーを refresh。
`falcon.disconnect` は `secrets.delete("falcon.accessToken")`。
`api.ts` の `apiRequest` は secrets から token を読む。

- [ ] **Step 4: 手動確認**

`dev:api` + `dev` 起動。拡張を Extension Development Host で開く。Web `/connect-vscode` → VS Code が開き「接続しました」。

---

### Task 5: コースツリーと進捗表示

**Files:**
- Create: `apps/vscode/src/tree.ts`
- Create: `apps/vscode/src/catalog.ts`
- Modify: `apps/vscode/src/extension.ts`（`TreeDataProvider` を `falcon.lessons` に登録）

**Interfaces:**
- Consumes: `GET /api/me`, `GET /api/enrollments/mine`, `GET /api/cms/courses`, `GET /api/cms/courses/:id`, `GET /api/lesson-progress`
- Produces: `LessonTreeProvider implements vscode.TreeDataProvider<TreeNode>`
  - ノード: `CourseNode` / `SectionNode` / `LessonNode`
  - `LessonNode.contextValue` は `lesson-code` | `lesson-doc` | `lesson-web`
  - 完了レッスンは `ThemeIcon("pass")`、未完了は `circle-outline`

受講者が見るコースは `enrollments/mine` のうち `isReadableEnrollmentStatus` が true のものに限定する。staff（`role` が instructor / admin / platform_admin）は published コース一覧を出してよい。

レッスンクリック:

- `video` / `quiz` / `assignment` → `falcon.openInWeb`（`webUrl/courses/<courseId>/lessons/<lessonId>`）
- `text` / `slides` → Task 6 のドキュメント WebView
- `code` → この波では「Wave 2 で演習が有効になります」＋課題タイトル表示。ファイル展開は Task 8

- [ ] **Step 1: `catalog.ts` で上記 API を並列取得し、UI 用の木を組み立てる**
- [ ] **Step 2: TreeDataProvider を登録する。未接続時は「Web で接続」のダミーノード 1 つ**
- [ ] **Step 3: 接続後に自分の受講コースが出ることを Extension Development Host で確認する**

---

### Task 6: テキスト / スライドを WebView で読む

**Files:**
- Create: `apps/vscode/src/lesson-doc.ts`
- Modify: `apps/vscode/src/tree.ts`（doc レッスンのコマンド）

**Interfaces:**
- Consumes: `GET /api/cms/courses/:id` の lesson 行（`content_md` / 既存のレッスン本文フィールド。Web の `LessonMarkdown` が読んでいるのと同じ列）
- Produces: `openLessonDoc(lesson): void` — `WebviewPanel` 1 枚。Markdown はホストで HTML エスケープしたうえで、既存 Web と同じく GFM 相当を出す。外部スクリプトは載せない。`localResourceRoots` は空でよい（画像は後続）

Web の `LessonMarkdown` / `MarkdownSlides` が参照するフィールド名に合わせる。`apps/web/src/data/types.ts` の `Lesson` と `packages/shared/src/cms/types.ts` の `lessonToRow` / `mapCourseToUi` を読んで、本文が `content` なのか `body` なのかを実装時に合わせる。推測で新しい列を足さない。

- [ ] **Step 1: マッパーが使う本文フィールドを `mapCourseToUi` から確認する**
- [ ] **Step 2: WebView で text / slides レッスンを表示する**
- [ ] **Step 3: 目次から開いて読めることを確認する**

---

## Wave 2 — 演習

この波の終わりで、既存 TypeScript の code レッスンを拡張だけでクリアできる。

### Task 7: 課題フォルダへ starter を展開する

**Files:**
- Create: `apps/vscode/src/workspace.ts`
- Create: `packages/shared/src/vscode/exercise-paths.ts`
- Create: `packages/shared/src/vscode/exercise-paths.test.ts`

**Interfaces:**
- Consumes: `GET /api/cms/assignments/:id` → `mapAssignmentRowToAssignment`
- Produces:
  - `exerciseRoot(homeDir: string, assignmentId: string): string` → `<home>/.falcon-informal/exercises/<assignmentId>`
  - `filesToWrite(assignment): Array<{ relPath: string, content: string, readonly: boolean }>` — `getStarterFiles` のみ。`tests` / `mutation` / `sqlSeed` は含めない
  - `openExercise(assignment): Promise<vscode.Uri>` — ディレクトリを作り、無いファイルだけ書く（既存の学習者編集を消さない）。`readonly` ファイルは書き込み後に fs の permission は変えず、エディタで `editor.readonly` 相当は後続でよい。このタスクではファイル作成と `vscode.openFolder` または `vscode.open` で entry file を開く

`openFolder` はウィンドウ全体を置き換えるので使わない。`vscode.workspace.updateWorkspaceFolders` で exercises ルートをマルチルートに追加するか、entry file を `openTextDocument` + `showTextDocument` する。採用: **assignment フォルダを workspace folder として追加**（既にあれば追加しない）。

- [ ] **Step 1: `exerciseRoot` / `filesToWrite` のテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { exerciseRoot } from "./exercise-paths.js";

describe("exerciseRoot", () => {
  it("nests under .falcon-informal/exercises", () => {
    expect(exerciseRoot("/home/u", "asg-1").replace(/\\/g, "/")).toBe(
      "/home/u/.falcon-informal/exercises/asg-1",
    );
  });
});
```

`filesToWrite` は fixture の `Assignment`（`starterFiles` 2 件、`tests` 1 件）を渡し、戻りが starter の path だけであることを断言する。

- [ ] **Step 2: 実装してテストを通す**
- [ ] **Step 3: ツリーの code レッスンクリックでフォルダが作られ、entry file が開くことを確認する。フォルダ内に tests が無いこと**

---

### Task 8: grader WebView と採点コマンド

**Files:**
- Create: `apps/vscode/src/grader.ts`
- Create: `apps/vscode/src/grader-host.ts`
- Create: `apps/vscode/grader-webview/main.ts`
- Create: `apps/vscode/grader-webview/index.html`
- Modify: `apps/vscode/esbuild.mjs`（`grader-webview/main.ts` を IIFE / ESM browser bundle として `dist/grader.js` に出す）
- Move or share: Web の `apps/web/src/practice/lib/linters` を `packages/shared` か `packages/code-runner` に出すのは大きいので、**grader-webview が `@stella/code-runner` の `runGrading` と、web からコピーせず `packages/shared` の `analyzeAst` + 既存 linter ディスパッチを使う**。linter が web 専用なら、grader-webview から `apps/web/src/practice/lib/linters` を import せず、同じモジュールを `packages/code-runner/src/lint.ts` に移す。移設がこのタスクの一部。呼び出し側（`AssignmentEditor` と PracticeWorkspace）の import を新パスに更新する

**Interfaces:**
- Produces:
  - `gradeFiles(input: { assignment: Assignment, files: Record<string, string> }): Promise<ExecutionResult>`
  - WebView メッセージ:
    - host → webview: `{ type: "grade", requestId, assignment, files }`
    - webview → host: `{ type: "grade-result", requestId, result }` または `{ type: "grade-error", requestId, message }`
  - `ExecutionResult` は `apps/web/src/practice/hooks/useGradeRunner.ts` の同名型と同じ形（`testResults`, `evaluation`, `lintAtRun`, `astAtRun`）

Lint 移設後の公開:

```ts
// packages/code-runner/src/lint.ts
export function lintAssignment(
  code: string,
  assignment: Assignment,
): { lint: LintViolation[]; ast: ASTResult };
```

中身は現行 `getLinter` + `analyzeAst` を呼ぶだけ。`useStaticAnalysis` / `AssignmentEditor` はこれを使う。

- [ ] **Step 1: `lintAssignment` を code-runner に移し、web の import を張り替える。`bun run typecheck` と既存 shared テストを通す**
- [ ] **Step 2: grader-webview で `lintAssignment` + `runGrading` を実行する**
- [ ] **Step 3: 拡張コマンド `falcon.grade` がアクティブな assignment フォルダのファイルを読んで `gradeFiles` する**
- [ ] **Step 4: 既知のクリア済み課題（seed の簡単な stdout 課題）を starter のまま採点して fail、正解を書いて pass することを確認する**

---

### Task 9: クリア・リセット・次へ・出力 UI

**Files:**
- Create: `apps/vscode/src/exercise-panel.ts`
- Modify: `apps/vscode/src/workspace.ts`（reset は starter で上書き。確認は `showWarningMessage`）
- Modify: `apps/vscode/src/tree.ts`（refresh on complete）
- Modify: `apps/vscode/src/catalog.ts`（progress upsert）

**Interfaces:**
- Consumes: `POST /api/lesson-progress` body `{ rows: ProgressSyncInput[] }`（`packages/shared/src/study/progress-sync.ts` の形）
- Produces:
  - `markLessonComplete(lessonId: string): Promise<void>`
  - 課題 WebView: 課題文、採点結果一覧、クリア時の「次のレッスンへ」
  - `falcon.resetExercise`: 確認後に starter 上書き

`markLessonComplete`:

```ts
await apiRequest("/api/lesson-progress", {
  method: "POST",
  body: {
    rows: [
      {
        lesson_id: lessonId,
        completed: true,
        last_page: null,
        viewed_pages: [],
        watched_sec: null,
        updated_at: new Date().toISOString(),
      },
    ],
  },
});
```

`evaluation.cleared === true` のときだけ呼ぶ。一度完了したレッスンを失敗採点で未完了に戻さない（PracticeWorkspace の `recordResult` と同じ OR）。

- [ ] **Step 1: クリア時だけ progress が立つことを、API が起動した状態で 1 課題分確認する**
- [ ] **Step 2: Web のコース画面をリロードし、同じレッスンが完了になっていることを確認する**
- [ ] **Step 3: リセットでファイルが starter に戻り、クリア状態（サーバ）は消えないことを確認する**

---

### Task 10: レッスンディープリンクと Web の「VS Code で開く」

**Files:**
- Modify: `apps/vscode/src/extension.ts`（URI `/lesson`）
- Modify: `apps/web/src/components/learner/LessonPlayer.tsx`（code 分岐の横に CTA を足す。このタスクでは PracticeWorkspace はまだ残してよい）
- Create: `apps/web/src/components/learner/OpenInVscodeButton.tsx`

**Interfaces:**
- `OpenInVscodeButton` props: `{ courseId: string, lessonId: string }`
  - クリック: `POST /api/auth/vscode-link` → `window.location.assign(buildVscodeLessonUri(...))` では token が渡らない。
  - 採用: 未接続の拡張のために **先に link URI、続けて lesson URI は拡張がキューする** のではなく、lesson URI だけを開く。拡張が未接続なら `/connect-vscode` を開き、接続後に `pendingLesson` を `context.globalState` から再開する。
  - Web は `buildVscodeLessonUri(courseId, lessonId)` を `location.assign` するだけ。接続が無ければ拡張が Web 接続ページを開く

- [ ] **Step 1: 拡張の `/lesson` handler を実装する。未接続なら `falcon.connect` 相当を実行し、`pendingLesson` を保存。接続済みならそのレッスンを開く（code なら Task 7、doc なら Task 6、他は Web）**
- [ ] **Step 2: LessonPlayer の code レッスンに `OpenInVscodeButton` を出す**
- [ ] **Step 3: Web のボタン → 拡張が該当課題を開くことを確認する**

---

## Wave 3 — PracticeWorkspace を受講者経路から外す

### Task 11: LessonPlayer から PracticeWorkspace を外す

**Files:**
- Modify: `apps/web/src/components/learner/LessonPlayer.tsx`
- Create: `apps/web/src/components/learner/CodeLessonHandoff.tsx`
- Modify: `apps/web/src/components/common/LessonAIContext.tsx`（practice context の bootstrap をやめる。code レッスンは `kind: 'lesson'` のまま）

**Interfaces:**
- `CodeLessonHandoff` props: `{ courseId, lessonId, assignmentTitle?: string }`
  - デスクトップ: 課題タイトル + `OpenInVscodeButton` + 拡張の入れ方（1 段落）
  - モバイル（`max-md`）: 「この演習はパソコンの VS Code で進めてください」のみ。ボタンは出してもよいが、vscode:// はモバイルで失敗するので主文は案内

`isCode && assignmentId` の分岐を `<PracticeWorkspace />` から `<CodeLessonHandoff />` に置き換える。`onCleared` / `onAskAi` from practice は削除。

- [ ] **Step 1: LessonPlayer の lazy import を削除し、handoff に差し替える**
- [ ] **Step 2: `bun run --filter=@stella/web typecheck` と `bun run build`（web）**
Expected: PASS。practice チャンクが受講者ルートから消える
- [ ] **Step 3: デスクトップで code レッスンを開き、エディタが無いこと。モバイル幅（DevTools）で案内文だけなこと**

---

### Task 12: 受講者専用 practice ファイルの削除

**Files（削除）:**
- `apps/web/src/practice/PracticeWorkspace.tsx`
- `apps/web/src/practice/hooks/useGradeRunner.ts`
- `apps/web/src/practice/hooks/useProgress.ts`
- `apps/web/src/practice/hooks/useRunResultReveal.ts`
- `apps/web/src/practice/hooks/useStaticAnalysis.ts`（`lintAssignment` へ移行済みなら）
- `apps/web/src/practice/components/BottomPanel/**`
- `apps/web/src/practice/components/RunResultDialog.tsx`
- `apps/web/src/practice/components/RunResultBody.tsx`
- `apps/web/src/practice/components/AssignmentView.tsx`（講師が使っていなければ）
- `apps/web/src/practice/lib/progress-store.ts`

**Files（残す）:**
- `apps/web/src/practice/components/Editor.tsx`
- `apps/web/src/practice/components/FileTabs.tsx`
- `apps/web/src/practice/lib/linters/**` — Task 8 で移設済みならディレクトリごと削除し、`AssignmentEditor` は `@stella/code-runner` を import

**Files（修正）:**
- `apps/web/src/components/admin/AssignmentEditor.tsx`
- `apps/web/src/components/admin/assignment-editor/FilesForm.tsx`
- `apps/web/src/components/admin/assignment-editor/PreviewPanel.tsx`
- `apps/web/vite.config.ts` のコメント（PracticeWorkspace 言及）

- [ ] **Step 1: `rg PracticeWorkspace apps/web` が 0 件になるまで削除 / 張り替え**
- [ ] **Step 2: `bun run --filter=@stella/web typecheck && bun run --filter=@stella/web build`**
Expected: PASS
- [ ] **Step 3: 講師の課題プレビューで「採点」がまだ動くことを確認する**

---

### Task 13: ドキュメントと開発手順

**Files:**
- Modify: `README.md`（学習者: Web で開始、演習は VS Code 拡張）
- Modify: `AGENTS.md`（拡張の dev: Extension Development Host、`apps/vscode`）
- Create: `apps/vscode/README.md`（接続手順、設定 `falcon.serverUrl` / `falcon.webUrl`、ローカル VSIX）

書く内容:

- 学習者: Web ログイン → 拡張インストール → `/connect-vscode` またはレッスンの「VS Code で開く」
- 開発者: `bun run dev:api` → `bun run dev` → `apps/vscode` を F5
- 本番: Marketplace 公開はこのタスクでは手順だけ。公開作業はしない

- [ ] **Step 1: 上記 3 ファイルを更新する**
- [ ] **Step 2: AGENTS.md の「PracticeWorkspace で演習」という記述を拡張に書き換える**

---

## 手動検証（全波のあと）

1. 学習者で Web ログイン → 受講登録済みの TypeScript コースを開く
2. `/connect-vscode` で拡張に接続する
3. 拡張の目次にコースが出る。テキストレッスンが読める。動画レッスンはブラウザが開く
4. 簡単な code レッスンを開き、わざと間違えて採点 → 失敗
5. 正しく直して採点 → クリア。Web をリロードしても完了
6. 別ブラウザ（またはシークレット）のモバイル幅で同じ code レッスン → エディタ無し
7. 講師で AssignmentEditor プレビュー採点が通る
8. `~/.falcon-informal/exercises/<id>/` にテスト JSON が無い

## 後続（この計画に含めない）

- 拡張からの `/api/chat` と `/api/submissions`
- JWT 24h を超える再接続なしセッション
- Marketplace 公開と CI での vsix ビルド
- HTML/CSS / Git コース
- SQL ターミナル UI
