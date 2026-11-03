/** 提出時の版に対応する教材・規則・提出ファイルを集める。AI との通信は行わない。 */
import type { AiFailure, ReviewRubricItem } from "@stella/shared/review/ai-review";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  sections,
  stages,
  type submissions,
  taskPrivateVersions,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import type { Env } from "../env.js";
import type { ReviewMaterial } from "./ai-review-prompt.js";
import { loadCodingRuleSet } from "./coding-rule-set.js";
import { readSubmissionFiles } from "./task-submission.js";
type SubmissionRow = typeof submissions.$inferSelect;

export interface LoadedMaterial {
  material: ReviewMaterial;
  stageId: string;
  /** 受講者がすでに持っている本文 (提出と配布物)。返信の照合で除く。 */
  known: string[];
  appliedRules: { id: string; required: boolean; contentHash: string | null }[];
  ruleSetHash: string;
  escalateWhen: string[];
}

function decodeBase64(value: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));
}

interface TaskDefinitionReview {
  kind?: string;
  title?: string;
  review?: {
    rules?: { id: string; required: boolean }[];
    rubric?: { id: string; criterion: string; required: boolean }[];
    escalateWhen?: string[];
  };
}

/**
 * 提出時の課題の版・規則・解答例・提出ファイルを集める。足りなければ失敗の理由を返す。
 * 候補のモデル・指示の当て直し (`scripts/ai-review-replay.ts`) も同じ関数で集める。
 */
export async function loadMaterial(
  db: Db,
  env: Env,
  row: SubmissionRow,
): Promise<LoadedMaterial | { failure: AiFailure; detail: string }> {
  if (!row.taskId || !row.taskContentHash)
    return { failure: "error", detail: "課題の提出ではありません" };
  const [task] = await db
    .select({ stageId: sections.stageId, slug: stages.slug })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(tasks.id, row.taskId))
    .limit(1);
  const [revision] = await db
    .select({ definition: taskRevisions.definition, bundle: taskRevisions.bundle })
    .from(taskRevisions)
    .where(
      and(eq(taskRevisions.taskId, row.taskId), eq(taskRevisions.contentHash, row.taskContentHash)),
    )
    .limit(1);
  if (!task || !revision) return { failure: "error", detail: "課題の版が見つかりません" };
  // 解答例と観点は、提出を受け付けた時点の素材の版を読む。版が記録されていない提出
  // (今の版と違う課題の版への提出、0048 より前で素材が分からない提出) と、版の行が無い提出は、
  // 別の解答例で判定・照合しないよう AI を呼ばずに人に回す。
  const [privateVersion] = row.taskPrivateHash
    ? await db
        .select({ files: taskPrivateVersions.files })
        .from(taskPrivateVersions)
        .where(
          and(
            eq(taskPrivateVersions.taskId, row.taskId),
            eq(taskPrivateVersions.privateHash, row.taskPrivateHash),
          ),
        )
        .limit(1)
    : [];
  if (!privateVersion)
    return {
      failure: "stale-material",
      detail: row.taskPrivateHash
        ? `非公開の素材の版 (${row.taskPrivateHash.slice(0, 20)}) がありません`
        : "提出時の非公開の素材の版が記録されていません",
    };
  const definition = JSON.parse(revision.definition) as TaskDefinitionReview;
  const ruleRefs = definition.review?.rules ?? [];
  const ruleSet = await loadCodingRuleSet(db, task.slug);
  const ruleRows = ruleSet.rows;
  // 提出のあとに規則が変わっていたら、受け付けた時点に無かった規則で判定しないよう人に回す。
  // 版が null の提出は 0048 より前のもの (規則の正本がまだ無かった) なので、今の規則で見る。
  if (row.ruleSetHash !== null && row.ruleSetHash !== ruleSet.hash)
    return {
      failure: "stale-material",
      detail: `提出のあとにコーディング規則が変わりました (${row.ruleSetHash.slice(0, 12)} → ${ruleSet.hash.slice(0, 12)})`,
    };
  // 提出の版が参照する規則が正本から消えていたら、本文なしでは判定できないので AI を呼ばずに
  // 人に回す (AI が本文の無い項目に「満たす」と答えても確定させない)。
  const missingRules = ruleRefs.filter((ref) => !ruleRows.some((r) => r.id === ref.id));
  if (missingRules.length > 0)
    return {
      failure: "stale-material",
      detail: `規則の本文が見つかりません: ${missingRules.map((ref) => ref.id).join(", ")}`,
    };
  const { commonRules, courseRules } = ruleSet;
  const rubric: ReviewRubricItem[] = [
    ...ruleRefs.flatMap((ref) => {
      const rule = ruleRows.find((r) => r.id === ref.id);
      return rule
        ? [{ id: ref.id, criterion: rule.statement, required: ref.required, rule: true }]
        : [];
    }),
    ...(definition.review?.rubric ?? []).map((item) => ({ ...item, rule: false })),
  ];
  const privateFiles = JSON.parse(privateVersion.files) as Record<string, string>;
  const solution = Object.entries(privateFiles)
    .filter(([path]) => path.startsWith("solution/"))
    .map(([path, value]) => ({ path: path.slice("solution/".length), text: decodeBase64(value) }));
  const snapshot = row.taskSnapshot;
  // 配布物 (starter・テスト・課題文) は受講者がすでに持っているので、返信の照合から除く。
  const bundle = JSON.parse(revision.bundle) as { files?: Record<string, string> };
  const bundleTexts = Object.values(bundle.files ?? {}).map(decodeBase64);
  let files: Awaited<ReturnType<typeof readSubmissionFiles>>;
  try {
    files = await readSubmissionFiles(db, env, row.id);
  } catch (e) {
    return {
      failure: "error",
      detail: e instanceof Error ? e.message : "提出ファイルを読めません",
    };
  }
  const submissionFiles = files.map((f) => ({
    path: f.path,
    bytes: f.bytes,
    text: f.text.includes("\u0000") || f.text.includes("�") ? null : f.text,
  }));
  const material: ReviewMaterial = {
    kind: row.taskKind ?? definition.kind ?? "basic",
    taskTitle: row.assignmentTitle,
    courseSlug: task.slug,
    taskText: snapshot?.files["README.md"] ? decodeBase64(snapshot.files["README.md"]) : "",
    rubric,
    commonRules,
    courseRules,
    solution,
    reviewGuide: privateFiles["review.md"] ? decodeBase64(privateFiles["review.md"]) : "",
    submission: {
      files: submissionFiles,
      explanation: row.explanation ?? "",
      debuggingRecord: row.debuggingRecord ?? null,
      localResult: row.localResult ?? null,
      support: row.supportLog ?? [],
      ciRun: row.machineCheck?.ci ?? null,
    },
  };
  return {
    material,
    stageId: task.stageId,
    known: [
      ...submissionFiles.flatMap((f) => (f.text === null ? [] : [f.text])),
      ...bundleTexts,
      row.explanation ?? "",
    ],
    appliedRules: ruleRefs.map((ref) => ({
      id: ref.id,
      required: ref.required,
      contentHash: ruleRows.find((r) => r.id === ref.id)?.contentHash ?? null,
    })),
    ruleSetHash: ruleSet.hash,
    escalateWhen: definition.review?.escalateWhen ?? [],
  };
}
