import { exchangeVscodeLink } from "@falcon/shared/vscode/auth-exchange";
import * as vscode from "vscode";
import { AuthExpiredError, initApi } from "./api.js";
import { AuthStore, disposeAuthEvents } from "./auth.js";
import { findNextLesson, resolveLessonForExercise } from "./catalog-progress.js";
import {
  findCachedLesson,
  getCachedCatalog,
  loadCatalog,
  markLessonComplete,
  type CatalogLesson,
} from "./catalog.js";
import {
  PENDING_LESSON_KEY,
  consumePendingOnSuccess,
  isExtensionUriPath,
  loadLessonForUri,
  parseLinkCode,
  parsePendingLesson,
  readPendingLesson,
  requireDeepLinkedLesson,
  shouldResumeAfterLink,
  type PendingLesson,
} from "./deep-link.js";
import { openExercisePanel } from "./exercise-panel.js";
import { formatGradeMessage, gradeActiveExercise, resolveActiveAssignmentId } from "./grader.js";
import type { ExecutionResult } from "./grader-protocol.js";
import { initGraderHost } from "./grader-host.js";
import { openLessonDoc } from "./lesson-doc.js";
import {
  openLessonNode,
  refreshLessonTree,
  registerLessonTree,
  toLessonNode,
  type LessonNode,
} from "./tree.js";
import {
  getActiveExercise,
  getAssignmentForGrading,
  openLessonCode,
  resetExercise,
} from "./workspace.js";

function findCachedLessonForNode(node: LessonNode): CatalogLesson | undefined {
  return findCachedLesson(node.courseId, node.id);
}

async function resolveLessonForActiveExercise(): Promise<CatalogLesson | undefined> {
  const assignmentId = resolveActiveAssignmentId();
  if (!assignmentId) {
    return undefined;
  }
  const active = getActiveExercise();
  const fromCache = resolveLessonForExercise(assignmentId, active, getCachedCatalog());
  if (fromCache) {
    return fromCache;
  }
  const catalog = await loadCatalog();
  return resolveLessonForExercise(assignmentId, active, catalog);
}

async function showExerciseForLesson(
  lesson: CatalogLesson,
  result?: ExecutionResult,
): Promise<void> {
  const assignmentId = lesson.assignmentId;
  if (!assignmentId) {
    return;
  }
  const assignment = await getAssignmentForGrading(assignmentId);
  const next = findNextLesson(getCachedCatalog(), lesson.courseId, lesson.id);
  openExercisePanel({
    assignmentTitle: assignment.title,
    description: assignment.description,
    courseId: lesson.courseId,
    lessonId: lesson.id,
    ...(result ? { result } : {}),
    ...(next
      ? { nextLesson: { courseId: next.courseId, lessonId: next.id, title: next.title } }
      : {}),
    alreadyCleared: lesson.completed || result?.evaluation.cleared === true,
  });
}

function falconConfig(key: "serverUrl" | "webUrl", fallback: string): string {
  return vscode.workspace.getConfiguration("falcon").get<string>(key, fallback).replace(/\/+$/, "");
}

/**
 * 接続専用ページは持たない。 接続は Web のコードレッスンの「VS Code で開く」から始まり、
 * そのボタンが接続コードを載せた lesson URI を開く。 未接続で来た時は開きたいレッスン
 * (分かる場合) の Web ページへ送り返して、 同じボタンを押してもらう。
 */
async function openWebForConnect(target?: PendingLesson): Promise<void> {
  const web = falconConfig("webUrl", "http://127.0.0.1:5173");
  const path = target ? `/courses/${target.courseId}/lessons/${target.lessonId}` : "/courses";
  void vscode.window.showInformationMessage(
    "FALCON に接続していません。 Web のコードレッスンで「VS Code で開く」を押してください",
  );
  await vscode.env.openExternal(vscode.Uri.parse(`${web}${path}`));
}

async function openDeepLinkedLesson(courseId: string, lessonId: string): Promise<void> {
  const lesson = requireDeepLinkedLesson(
    await loadLessonForUri(courseId, lessonId, loadCatalog, findCachedLesson),
  );
  openLessonNode(toLessonNode(lesson));
}

async function resumePendingLesson(context: vscode.ExtensionContext): Promise<void> {
  const leftover = await consumePendingOnSuccess(
    readPendingLesson(context.globalState.get(PENDING_LESSON_KEY)),
    async (pending) => {
      await openDeepLinkedLesson(pending.courseId, pending.lessonId);
    },
  );
  await context.globalState.update(PENDING_LESSON_KEY, leftover);
}

async function handleLessonUri(
  uri: vscode.Uri,
  auth: AuthStore,
  context: vscode.ExtensionContext,
): Promise<void> {
  const pending = parsePendingLesson(uri.query);
  if (!pending) {
    void vscode.window.showInformationMessage("レッスン指定がありません");
    return;
  }

  // lesson URI が接続コードを連れてきたら、 先に JWT 交換まで済ませる。 これで Web の
  // 「VS Code で開く」1 クリックが 接続 → レッスン表示 まで通る。
  const code = parseLinkCode(uri.query);
  if (code) {
    await linkFromLessonUri(code, auth);
  }

  const token = await auth.getToken();
  if (!token) {
    await context.globalState.update(PENDING_LESSON_KEY, pending);
    await openWebForConnect(pending);
    return;
  }

  try {
    await openDeepLinkedLesson(pending.courseId, pending.lessonId);
    await context.globalState.update(PENDING_LESSON_KEY, undefined);
  } catch (err) {
    if (err instanceof AuthExpiredError) {
      await context.globalState.update(PENDING_LESSON_KEY, pending);
      await openWebForConnect(pending);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(message);
  }
}

/** 成功したら undefined。 失敗の見せ方は呼び出し側の状況で変わるので、 ここでは通知しない。 */
async function exchangeLinkCode(code: string, auth: AuthStore): Promise<Error | undefined> {
  try {
    const token = await exchangeVscodeLink(
      falconConfig("serverUrl", "http://127.0.0.1:8787"),
      code,
      fetch,
    );
    await auth.setToken(token);
    return undefined;
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * lesson URI に載ってきた接続コードを使う。 接続済みの利用者には毎回の再交換を見せない
 * ため、 未接続だった時だけ結果を通知する (使用済みコードでの失敗も同様に黙って捨てる)。
 */
async function linkFromLessonUri(code: string, auth: AuthStore): Promise<void> {
  const wasConnected = (await auth.getToken()) !== null;
  const failure = await exchangeLinkCode(code, auth);
  if (wasConnected) {
    return;
  }
  if (failure) {
    void vscode.window.showErrorMessage(failure.message);
    return;
  }
  void vscode.window.showInformationMessage("FALCON に接続しました");
}

/** 旧クライアント (接続専用ページ) からの `/link` URI 用。 */
async function handleLinkUri(uri: vscode.Uri, auth: AuthStore): Promise<boolean> {
  const code = parseLinkCode(uri.query);
  if (!code) {
    void vscode.window.showInformationMessage("接続コードがありません");
    return false;
  }
  const failure = await exchangeLinkCode(code, auth);
  if (failure) {
    void vscode.window.showErrorMessage(failure.message);
    return false;
  }
  void vscode.window.showInformationMessage("FALCON に接続しました");
  return true;
}

async function handleExtensionUri(
  uri: vscode.Uri,
  auth: AuthStore,
  context: vscode.ExtensionContext,
): Promise<void> {
  if (isExtensionUriPath(uri.path, "link")) {
    const linked = await handleLinkUri(uri, auth);
    if (shouldResumeAfterLink(linked)) {
      try {
        await resumePendingLesson(context);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(message);
      }
    }
    return;
  }
  if (isExtensionUriPath(uri.path, "lesson")) {
    await handleLessonUri(uri, auth, context);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const auth = new AuthStore(context.secrets);
  initApi(auth);
  const grader = initGraderHost(context.extensionUri);
  registerLessonTree(context, auth);

  context.subscriptions.push(
    { dispose: disposeAuthEvents },
    { dispose: () => grader.dispose() },
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        void handleExtensionUri(uri, auth, context);
      },
    }),
    vscode.commands.registerCommand("falcon.connect", async () => {
      await openWebForConnect();
    }),
    vscode.commands.registerCommand("falcon.disconnect", async () => {
      await auth.clear();
    }),
    vscode.commands.registerCommand("falcon.refresh", () => {
      refreshLessonTree();
    }),
    vscode.commands.registerCommand(
      "falcon.openInWeb",
      async (courseId?: string, lessonId?: string) => {
        const web = falconConfig("webUrl", "http://127.0.0.1:5173");
        const path =
          typeof courseId === "string" && typeof lessonId === "string"
            ? `/courses/${courseId}/lessons/${lessonId}`
            : "";
        await vscode.env.openExternal(vscode.Uri.parse(`${web}${path}`));
      },
    ),
    vscode.commands.registerCommand("falcon.openLessonDoc", (node?: LessonNode) => {
      if (!node?.id || !node.courseId) {
        void vscode.window.showInformationMessage("レッスンをサイドバーから選んでください");
        return;
      }
      openLessonDoc(node);
    }),
    vscode.commands.registerCommand("falcon.grade", async () => {
      try {
        const result = await gradeActiveExercise();
        const lesson = await resolveLessonForActiveExercise();
        if (lesson) {
          await showExerciseForLesson(lesson, result);
        }
        const message = formatGradeMessage(result);
        if (result.evaluation.cleared) {
          if (!lesson) {
            void vscode.window.showErrorMessage(
              "レッスンを特定できないため、進捗を記録できませんでした",
            );
            return;
          }
          await markLessonComplete(lesson.id);
          refreshLessonTree();
          void vscode.window.showInformationMessage(message);
        } else {
          void vscode.window.showWarningMessage(message);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(message);
      }
    }),
    vscode.commands.registerCommand("falcon.resetExercise", async () => {
      const assignmentId = resolveActiveAssignmentId();
      if (!assignmentId) {
        void vscode.window.showInformationMessage("課題フォルダを開いてください");
        return;
      }
      try {
        const assignment = await getAssignmentForGrading(assignmentId);
        await resetExercise(assignment);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(message);
      }
    }),
    vscode.commands.registerCommand(
      "falcon.openNextLesson",
      (courseId?: string, lessonId?: string) => {
        if (typeof courseId !== "string" || typeof lessonId !== "string") {
          return;
        }
        const next = findNextLesson(getCachedCatalog(), courseId, lessonId);
        if (!next) {
          void vscode.window.showInformationMessage("次のレッスンはありません");
          return;
        }
        openLessonNode(toLessonNode(next));
      },
    ),
    vscode.commands.registerCommand("falcon.openLessonCode", async (node?: LessonNode) => {
      if (!node?.id) {
        void vscode.window.showInformationMessage("レッスンをサイドバーから選んでください");
        return;
      }
      try {
        await openLessonCode(node);
        const lesson = findCachedLessonForNode(node) ?? {
          id: node.id,
          courseId: node.courseId,
          title: node.title,
          type: node.lessonType,
          completed: node.completed,
          ...(node.assignmentId ? { assignmentId: node.assignmentId } : {}),
        };
        await showExerciseForLesson(lesson);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(message);
      }
    }),
  );
}

export function deactivate(): void {
  return;
}
