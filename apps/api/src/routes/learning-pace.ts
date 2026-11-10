import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { parsePaceSettings } from "@stella/shared/study/pace";
import { learningDiagnostics, profiles, tasks, sections, stages } from "../db/schema.js";
import { ApiError, errorResponse, getCaller, requireAdmin } from "../lib/authz.js";
import {
  loadLearningPace,
  paceProfileUpdate,
  requirePaceLearner,
  visibleLearningPace,
} from "../lib/learning-pace.js";
import type { Env } from "../env.js";

export const learningPaceRoute = new Hono<{ Bindings: Env }>();

learningPaceRoute.get("/api/learning-pace", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    const userId = c.req.query("userId") ?? caller.id;
    const learner = await requirePaceLearner(db, caller, userId);
    const pace = await loadLearningPace(db, learner);
    return c.json({
      pace: userId === caller.id ? await visibleLearningPace(db, learner, pace) : pace,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

learningPaceRoute.get("/api/learning-pace/learners", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    requireAdmin(caller);
    const learners = await db
      .select({
        id: profiles.id,
        name: profiles.displayName,
      })
      .from(profiles)
      .where(and(eq(profiles.role, "student"), eq(profiles.disabled, false)));
    return c.json({ learners });
  } catch (err) {
    return errorResponse(c, err);
  }
});

learningPaceRoute.patch("/api/learning-pace/:userId", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    const userId = c.req.param("userId");
    await requirePaceLearner(db, caller, userId);
    const raw: unknown = await c.req.json().catch(() => null);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
      throw new ApiError("学習設定が不正です", 400);
    let update: ReturnType<typeof paceProfileUpdate>;
    try {
      update = paceProfileUpdate(parsePaceSettings(raw as Record<string, unknown>), userId);
    } catch (err) {
      throw new ApiError(err instanceof Error ? err.message : "学習設定が不正です", 400);
    }
    if (!Object.keys(update).length) throw new ApiError("更新する設定を入力してください", 400);
    await db.update(profiles).set(update).where(eq(profiles.id, userId));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

learningPaceRoute.get("/api/learning-pace/:userId/diagnostics", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    requireAdmin(caller);
    const userId = c.req.param("userId");
    await requirePaceLearner(db, caller, userId);
    const rows = await db
      .select({ skills: tasks.skills })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          eq(stages.status, "published"),
          eq(stages.format, 2),
          eq(tasks.active, true),
          isNull(tasks.variantOf),
        ),
      );
    const skills = [...new Set(rows.flatMap((r) => r.skills.assesses))].sort();
    const confirmed = await db
      .select({ skillId: learningDiagnostics.skillId, evidence: learningDiagnostics.evidence })
      .from(learningDiagnostics)
      .where(eq(learningDiagnostics.userId, userId));
    return c.json({ skills, confirmed });
  } catch (err) {
    return errorResponse(c, err);
  }
});

learningPaceRoute.put("/api/learning-pace/:userId/diagnostics", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    requireAdmin(caller);
    const userId = c.req.param("userId");
    await requirePaceLearner(db, caller, userId);
    const body = (await c.req.json().catch(() => null)) as {
      skill_id?: unknown;
      evidence?: unknown;
    } | null;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.skill_id !== "string" ||
      typeof body.evidence !== "string" ||
      !body.evidence.trim() ||
      body.evidence.length > 2000
    )
      throw new ApiError("スキルと診断の根拠 (2000文字以内) を入力してください", 400);
    const rows = await db
      .select({ skills: tasks.skills })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          eq(stages.status, "published"),
          eq(stages.format, 2),
          eq(tasks.active, true),
          isNull(tasks.variantOf),
        ),
      );
    if (!rows.some((r) => r.skills.assesses.includes(body.skill_id as string)))
      throw new ApiError("スキルが見つかりません", 404);
    const values = {
      userId,
      skillId: body.skill_id,
      confirmedBy: caller.id,
      evidence: body.evidence.trim(),
      confirmedAt: new Date(),
    };
    await db
      .insert(learningDiagnostics)
      .values(values)
      .onConflictDoUpdate({
        target: [learningDiagnostics.userId, learningDiagnostics.skillId],
        set: values,
      });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

learningPaceRoute.delete("/api/learning-pace/:userId/diagnostics/:skillId", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    requireAdmin(caller);
    const userId = c.req.param("userId");
    await requirePaceLearner(db, caller, userId);
    await db
      .delete(learningDiagnostics)
      .where(
        and(
          eq(learningDiagnostics.userId, userId),
          eq(learningDiagnostics.skillId, c.req.param("skillId")),
        ),
      );
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
