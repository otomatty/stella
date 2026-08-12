/**
 * FALCON INFORMAL API — Cloudflare Workers + Hono エントリ。
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Env } from "./env.js";
import { resolveCorsOrigin } from "./lib/cors.js";
import { adminRoute } from "./routes/admin.js";
import { authRoute } from "./routes/auth.js";
import { analyticsRoute } from "./routes/analytics.js";
import { auditLogsRoute } from "./routes/audit-logs.js";
import { certificatesRoute } from "./routes/certificates.js";
import { chatRoute } from "./routes/chat.js";
import { cmsRoute } from "./routes/cms.js";
import { enrollmentsRoute } from "./routes/enrollments.js";
import { healthzRoute } from "./routes/healthz.js";
import { lessonProgressRoute } from "./routes/lesson-progress.js";
import { materialsRoute } from "./routes/materials.js";
import { meRoute } from "./routes/me.js";
import { notificationsRoute } from "./routes/notifications.js";
import { quizRoute } from "./routes/quiz.js";
import { r2MaintenanceRoute } from "./routes/r2-maintenance.js";
import { reportsRoute } from "./routes/reports.js";
import { reviewDraftRoute } from "./routes/review-draft.js";
import { searchRoute } from "./routes/search.js";
import { studyActivityRoute } from "./routes/study-activity.js";
import { submissionsRoute } from "./routes/submissions.js";
import { supportRoute } from "./routes/support.js";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
  const corsMiddleware = cors({
    // null を返すと Access-Control-Allow-Origin ヘッダ自体が送られない (= 不許可)。
    origin: (origin) => resolveCorsOrigin(origin, c.env.ALLOWED_ORIGINS),
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
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
app.route("/", meRoute);
app.route("/", enrollmentsRoute);
app.route("/", auditLogsRoute);
app.route("/", notificationsRoute);
app.route("/", quizRoute);
app.route("/", certificatesRoute);
app.route("/", analyticsRoute);
app.route("/", reportsRoute);
app.route("/", submissionsRoute);
app.route("/", supportRoute);
app.route("/", cmsRoute);
app.route("/", materialsRoute);
app.route("/", r2MaintenanceRoute);
app.route("/", searchRoute);

export default app;
