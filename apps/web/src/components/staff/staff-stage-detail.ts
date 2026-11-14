import type {
  LessonRow,
  LessonType,
  StageWithChildren,
  StageMaterialRow,
} from "@stella/shared/cms/types";
import type { SOLUTION_UNLOCK_ATTEMPTS } from "@stella/shared/tasks/help";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import type { StaffStageTask } from "@stella/shared/tasks/staff-stage";

// help の実行時 import は Web の解答混入検査で拒否されるため、値はリテラル型で照合する。
// 共有定数が変われば型検査が失敗し、表示の更新漏れを防ぐ。
const solutionUnlockAttempts: typeof SOLUTION_UNLOCK_ATTEMPTS = 5;

export type StaffStageTab = "tasks" | "outline" | "learners" | "materials";
export function parseStaffStageTab(value: unknown): StaffStageTab {
  return value === "outline" || value === "learners" || value === "materials" ? value : "tasks";
}

export function groupStageSections(stage: StageWithChildren, tasks: readonly StaffStageTask[]) {
  const taskLessons = new Set(tasks.map((task) => task.lessonId).filter((id) => id !== null));
  return [...stage.sections]
    .sort((a, b) => a.section.order - b.section.order)
    .map(({ section, lessons }) => {
      const sectionTasks = tasks.filter((task) => task.sectionId === section.id);
      return {
        section,
        lessonCount: lessons.length,
        lessons: [...lessons]
          .filter((lesson) => !taskLessons.has(lesson.id))
          .sort((a, b) => a.order - b.order),
        tasks: sectionTasks,
        waiting: sectionTasks.reduce((sum, task) => sum + task.counts.waiting, 0),
      };
    });
}
export type StaffStageSection = ReturnType<typeof groupStageSections>[number];

export function taskSupportLabel(support: StaffStageTask["support"]): string {
  if (!support) return "—";
  const hints = support.hintLevels === 0 ? "なし" : `${support.hintLevels} 段`;
  const solutions: Record<string, string> = {
    "after-hints": "ヒントのあと",
    "attempts-or-passed": `${solutionUnlockAttempts} 回か合格後`,
    passed: "合格後",
    never: "出さない",
  };
  return `ヒント: ${hints} / 解答例: ${solutions[support.solutionUnlock] ?? "—"}`;
}

export interface StaffTaskFilter {
  kind: TaskKind | "all";
  waitingOnly: boolean;
  query: string;
}
export function filterStaffStageTasks(
  tasks: readonly StaffStageTask[],
  filter: StaffTaskFilter,
): StaffStageTask[] {
  const query = filter.query.trim().toLocaleLowerCase("ja");
  return tasks.filter(
    (task) =>
      (filter.kind === "all" || task.kind === filter.kind) &&
      (!filter.waitingOnly || task.counts.waiting > 0) &&
      (task.title.toLocaleLowerCase("ja").includes(query) ||
        task.id.toLocaleLowerCase("ja").includes(query)),
  );
}

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: "動画",
  slides: "スライド",
  text: "読み物",
  quiz: "知識問題",
  assignment: "旧形式の演習",
  code: "旧形式の演習",
};

export function prerequisitesLabel(prerequisites: readonly { title: string }[]): string {
  return prerequisites.length ? prerequisites.map((stage) => stage.title).join("、") : "なし";
}

/** API の単元・レッスン・資料順を保つ。同名のレッスンは ID で区別する。 */
export function groupStageMaterials(materials: readonly StageMaterialRow[]) {
  const sections: {
    title: string;
    lessons: { id: string; title: string; materials: StageMaterialRow[] }[];
  }[] = [];
  for (const material of materials) {
    let section = sections.find((candidate) => candidate.title === material.section_title);
    if (!section) {
      section = { title: material.section_title, lessons: [] };
      sections.push(section);
    }
    let lesson = section.lessons.find((candidate) => candidate.id === material.lesson_id);
    if (!lesson) {
      lesson = { id: material.lesson_id, title: material.lesson_title, materials: [] };
      section.lessons.push(lesson);
    }
    lesson.materials.push(material);
  }
  return sections;
}

export function lessonVideoStatus(
  lesson: Pick<LessonRow, "type" | "video_path" | "video_issue">,
): "published" | "stale" | "missing" | "none" {
  if (lesson.type !== "slides") return "none";
  if (lesson.video_path) return lesson.video_issue ? "stale" : "published";
  return lesson.video_issue ? "missing" : "none";
}

export function summarizeStageVideos(stage: StageWithChildren) {
  const summary = {
    total: 0,
    published: 0,
    attention: 0,
    firstAttentionLessonId: null as string | null,
  };
  for (const { lessons } of groupStageSections(stage, [])) {
    for (const lesson of lessons) {
      const status = lessonVideoStatus(lesson);
      if (status === "none") continue;
      summary.total++;
      if (status === "published") summary.published++;
      else {
        summary.attention++;
        summary.firstAttentionLessonId ??= lesson.id;
      }
    }
  }
  return summary;
}

export function adjacentStageLessons(stage: StageWithChildren, lessonId: string) {
  const lessons = groupStageSections(stage, []).flatMap((section) => section.lessons);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return {
    previous: index > 0 ? (lessons[index - 1] ?? null) : null,
    next: index >= 0 ? (lessons[index + 1] ?? null) : null,
  };
}
