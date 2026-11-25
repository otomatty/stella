import type { Lesson, LessonStatus, Section } from "@/data/types";

type SectionStatus = "current" | "done" | "progress" | "untouched";

interface LessonTocSection extends Section {
  status: SectionStatus;
  doneCount: number;
  allDone: boolean;
}

export type LessonTocOverrides = Record<string, boolean>;

export function resolveLessonTocSection(
  section: Section,
  getStatus: (lesson: Lesson) => LessonStatus,
  activeLesson: string,
): LessonTocSection {
  const doneCount = section.lessons.filter((lesson) => getStatus(lesson) === "done").length;
  const allDone = doneCount > 0 && doneCount === section.lessons.length;
  let status: SectionStatus = "untouched";
  if (section.lessons.some((lesson) => lesson.id === activeLesson)) {
    status = "current";
  } else if (allDone) {
    status = "done";
  } else if (doneCount > 0) {
    status = "progress";
  }
  return { ...section, status, doneCount, allDone };
}

export function isLessonTocSectionOpen(
  section: LessonTocSection,
  overrides: LessonTocOverrides,
): boolean {
  if (section.status === "current") return true;
  return Object.hasOwn(overrides, section.id)
    ? overrides[section.id]
    : section.status === "progress";
}

export function summarizeLessonTocSections(
  sections: readonly LessonTocSection[],
  overrides: LessonTocOverrides,
) {
  const counts = { done: 0, progress: 0, untouched: 0 };
  for (const section of sections) {
    const status =
      section.status === "current" ? (section.allDone ? "done" : "progress") : section.status;
    counts[status] += 1;
  }
  return {
    ...counts,
    allOpen: sections.every((section) => isLessonTocSectionOpen(section, overrides)),
  };
}

export function setAllLessonTocSectionsOpen(
  sections: readonly LessonTocSection[],
  overrides: LessonTocOverrides,
  open: boolean,
): LessonTocOverrides {
  return {
    ...overrides,
    ...Object.fromEntries(
      sections
        .filter((section) => section.status !== "current")
        .map((section) => [section.id, open]),
    ),
  };
}
