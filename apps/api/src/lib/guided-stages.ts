import { and, eq, isNull } from "drizzle-orm";
import { evaluateSkillMap, isRevealOneAtATimeIsland } from "@stella/shared/skill-map/evaluate";
import { filterIslandStages } from "@stella/shared/skill-map/islands";
import type { GuidedStagesResponse } from "@stella/shared/stage-grants/types";
import { evaluateSkillMapFor, isLockReasonNameVisible } from "../routes/skill-map.js";
import type { Db } from "../db/client.js";
import {
  sections,
  stageGrants,
  stages,
  taskProblemResults,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import type { Caller } from "./authz.js";
import { loadSkillMapSource } from "./skill-map-data.js";
import { guidanceColumns } from "./stage-grant-guidance.js";
import { countedProblemIds, readTaskDefinition } from "./task-problem-submission.js";

/** 割り当ての件数によらず、ステージ・課題・問題をそれぞれまとめて読む。 */
export async function loadGuidedStages(db: Db, caller: Caller): Promise<GuidedStagesResponse> {
  const grants = await db
    .select({
      stage_id: stageGrants.stageId,
      title: stages.title,
      category: stages.category,
      ...guidanceColumns,
    })
    .from(stageGrants)
    .innerJoin(stages, eq(stages.id, stageGrants.stageId))
    .where(
      and(
        eq(stageGrants.profileId, caller.id),
        eq(stages.status, "published"),
        eq(stages.audience, "granted"),
      ),
    )
    .orderBy(stages.title, stages.id);
  if (grants.length === 0) return { stages: [] };
  // 島の条件で伏せられている割り当ても案内するが、始められるとは言わない。
  const source = await loadSkillMapSource(db, caller, { showAllIslands: true });
  const visibleIds = new Set(
    filterIslandStages(source.stages, source.clearedStageIds).map((stage) => stage.id),
  );
  const evaluated = evaluateSkillMap({
    stages: source.stages,
    clearedStageIds: source.clearedStageIds,
    unlockedStageIds: source.unlockedStageIds,
  });
  // 前提名の公開と、段階表示の島で案内するステージの範囲を普段のツリーにそろえる。
  const ordinarySource = await loadSkillMapSource(db, caller);
  const ordinaryMap = evaluateSkillMapFor(ordinarySource);
  const visibleGrants = grants.filter(({ stage_id, category }) => {
    if (source.clearedStageIds.has(stage_id)) return false;
    if (isRevealOneAtATimeIsland(category)) {
      return ordinaryMap.visibility.get(stage_id) === "full";
    }
    return true;
  });
  if (visibleGrants.length === 0) return { stages: [] };
  const taskRows = await db
    .select({
      stageId: sections.stageId,
      id: tasks.id,
      hash: tasks.contentHash,
      definition: taskRevisions.definition,
      status: taskProgress.status,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(
      stageGrants,
      and(eq(stageGrants.stageId, sections.stageId), eq(stageGrants.profileId, caller.id)),
    )
    .leftJoin(
      taskRevisions,
      and(eq(taskRevisions.taskId, tasks.id), eq(taskRevisions.contentHash, tasks.contentHash)),
    )
    .leftJoin(
      taskProgress,
      and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, caller.id)),
    )
    .where(and(eq(tasks.active, true), isNull(tasks.variantOf)));
  const results = await db
    .select({
      taskId: taskProblemResults.taskId,
      problemId: taskProblemResults.problemId,
      contentHash: taskProblemResults.contentHash,
    })
    .from(taskProblemResults)
    .innerJoin(tasks, eq(tasks.id, taskProblemResults.taskId))
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(
      stageGrants,
      and(eq(stageGrants.stageId, sections.stageId), eq(stageGrants.profileId, caller.id)),
    )
    .where(
      and(
        eq(taskProblemResults.userId, caller.id),
        eq(tasks.active, true),
        isNull(tasks.variantOf),
      ),
    );
  const resultsByTask = new Map<string, typeof results>();
  for (const row of results) {
    const list = resultsByTask.get(row.taskId) ?? [];
    list.push(row);
    resultsByTask.set(row.taskId, list);
  }
  const progress = new Map<
    string,
    { tasks: number; passedTasks: number; problems: number; passedProblems: number }
  >();
  for (const row of taskRows) {
    const entry = progress.get(row.stageId) ?? {
      tasks: 0,
      passedTasks: 0,
      problems: 0,
      passedProblems: 0,
    };
    const passed = row.status === "passed" || row.status === "ai-passed";
    entry.tasks++;
    if (passed) entry.passedTasks++;
    const problems = readTaskDefinition(row.definition ?? "{}").problems ?? [];
    const counted = countedProblemIds(resultsByTask.get(row.id) ?? [], row.hash, passed);
    entry.problems += problems.length;
    entry.passedProblems += problems.filter((problem) => counted.has(problem.id)).length;
    progress.set(row.stageId, entry);
  }
  return {
    stages: visibleGrants.map(({ category: _category, ...grant }) => {
      const id = grant.stage_id;
      const enrolled = source.enrolledStageIds?.has(id) ?? false;
      const available = visibleIds.has(id) && evaluated.states.get(id) === "unlocked";
      const reasons = enrolled || available ? [] : (evaluated.lockReasons.get(id) ?? []);
      const p = progress.get(id);
      const namedReasons = reasons.filter(
        (reason) => reason.stageId !== undefined && isLockReasonNameVisible(ordinaryMap, reason),
      );
      return {
        ...grant,
        status: enrolled ? "in-progress" : available ? "available" : "locked",
        prerequisite_titles: namedReasons.map((reason) => reason.label),
        prerequisites_withheld: namedReasons.length < reasons.length,
        progress:
          p && p.problems > 0
            ? { unit: "problems", passed: p.passedProblems, total: p.problems }
            : { unit: "tasks", passed: p?.passedTasks ?? 0, total: p?.tasks ?? 0 },
      };
    }),
  };
}
