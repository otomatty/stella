/**
 * STELLA API — Cloudflare Workers + Hono エントリ。
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Env } from "./env.js";
import { getDb } from "./db/client.js";
import { runAiReviewSweep } from "./lib/ai-review-queue.js";
import { runPersonalTemplateGenerationCron } from "./lib/interview-answer-template-db.js";
import { runSubmissionOrphanCleanup } from "./lib/submission-orphan-cleanup.js";
import { resolveCorsOrigin } from "./lib/cors.js";
import { DEV_MODE_HEADER, LEGACY_DEV_MODE_HEADER } from "./lib/skill-map-data.js";
import { adminRoute } from "./routes/admin.js";
import { authRoute } from "./routes/auth.js";
import { analyticsRoute } from "./routes/analytics.js";
import { auditLogsRoute } from "./routes/audit-logs.js";
import { certificatesRoute } from "./routes/certificates.js";
import { chatRoute } from "./routes/chat.js";
import { cmsRoute } from "./routes/cms.js";
import { enrollmentPresetsRoute } from "./routes/enrollment-presets.js";
import { enrollmentsRoute } from "./routes/enrollments.js";
import { cmsDiscoveryRoute } from "./routes/cms-discovery.js";
import { discoveryRoute } from "./routes/discovery.js";
import { cmsHallOfFameRoute } from "./routes/cms-hall-of-fame.js";
import { hallOfFameRoute } from "./routes/hall-of-fame.js";
import { healthzRoute } from "./routes/healthz.js";
import { interviewPrepRoute } from "./routes/interview-prep.js";
import { lessonProgressRoute } from "./routes/lesson-progress.js";
import { materialsRoute } from "./routes/materials.js";
import { meRoute } from "./routes/me.js";
import { learningPaceRoute } from "./routes/learning-pace.js";
import { notifyPaceDelays } from "./lib/learning-pace.js";
import { notifyStumbles } from "./lib/stumble-alerts.js";
import { notificationsRoute } from "./routes/notifications.js";
import { quizRoute } from "./routes/quiz.js";
import { tasksRoute } from "./routes/tasks.js";
import { taskSupportRoute } from "./routes/task-support.js";
import { r2MaintenanceRoute } from "./routes/r2-maintenance.js";
import { reportsRoute } from "./routes/reports.js";
import { reviewDraftRoute } from "./routes/review-draft.js";
import { searchRoute } from "./routes/search.js";
import { skillCheckRoute } from "./routes/skill-check.js";
import { skillMapRoute } from "./routes/skill-map.js";
import { stageQueueRoute } from "./routes/stage-queue.js";
import { stageStartRoute } from "./routes/stage-start.js";
import { stageGrantsRoute } from "./routes/stage-grants.js";
import { skillSheetRoute } from "./routes/skill-sheet.js";
import { srsRoute } from "./routes/srs.js";
import { studyActivityRoute } from "./routes/study-activity.js";
import { submissionsRoute } from "./routes/submissions.js";
import { supportRoute } from "./routes/support.js";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
  const corsMiddleware = cors({
    // null を返すと Access-Control-Allow-Origin ヘッダ自体が送られない (= 不許可)。
    origin: (origin) => resolveCorsOrigin(origin, c.env.ALLOWED_ORIGINS),
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    // 画面が付ける独自ヘッダはここに挙げないと **全ての API 呼び出しが CORS で落ちる**
    // (プリフライトの Access-Control-Allow-Headers に載らないため)。増やしたら必ず足す。
    allowHeaders: ["Content-Type", "Authorization", DEV_MODE_HEADER, LEGACY_DEV_MODE_HEADER],
  });
  return corsMiddleware(c, next);
});

app.route("/", healthzRoute);
app.route("/", authRoute);
app.route("/", chatRoute);
app.route("/", reviewDraftRoute);
app.route("/", adminRoute);
app.route("/", lessonProgressRoute);
app.route("/", studyActivityRoute);
app.route("/", srsRoute);
app.route("/", meRoute);
app.route("/", learningPaceRoute);
app.route("/", enrollmentsRoute);
app.route("/", enrollmentPresetsRoute);
app.route("/", interviewPrepRoute);
app.route("/", skillMapRoute);
app.route("/", skillCheckRoute);
app.route("/", discoveryRoute);
app.route("/", cmsDiscoveryRoute);
app.route("/", hallOfFameRoute);
app.route("/", cmsHallOfFameRoute);
app.route("/", stageQueueRoute);
app.route("/", stageStartRoute);
app.route("/", stageGrantsRoute);
app.route("/", skillSheetRoute);
app.route("/", auditLogsRoute);
app.route("/", notificationsRoute);
app.route("/", quizRoute);
app.route("/", tasksRoute);
app.route("/", taskSupportRoute);
app.route("/", certificatesRoute);
app.route("/", analyticsRoute);
app.route("/", reportsRoute);
app.route("/", submissionsRoute);
app.route("/", supportRoute);
app.route("/", cmsRoute);
app.route("/", materialsRoute);
app.route("/", r2MaintenanceRoute);
app.route("/", searchRoute);

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runSubmissionOrphanCleanup(env, getDb(env)).catch((e) => {
        console.error("[cron] submission orphan cleanup failed", e);
      }),
    );
    ctx.waitUntil(
      notifyPaceDelays(getDb(env)).catch((e) => {
        console.error("[cron] learning pace notification failed", e);
      }),
    );
    // 提出直後に処理しきれなかった AI 一次レビュー (時間切れ・やり直し・ロック待ち) を拾う。
    ctx.waitUntil(
      runAiReviewSweep(env, getDb(env)).catch((e) => {
        console.error("[cron] ai review sweep failed", e);
      }),
    );
    ctx.waitUntil(
      notifyStumbles(getDb(env)).catch((e) => {
        console.error("[cron] stumble notification failed", e);
      }),
    );
    ctx.waitUntil(
      (async () => {
        try {
          const db = getDb(env);
          await runPersonalTemplateGenerationCron(env, db);
        } catch (e) {
          console.error("[cron] answer template generation poll failed", e);
        }
      })(),
    );
  },
};
