import { describe, expect, it } from "vitest";
import type { LessonStatus, Section } from "@/data/types";
import {
  isLessonTocSectionOpen,
  resolveLessonTocSection,
  setAllLessonTocSectionsOpen,
  summarizeLessonTocSections,
} from "./lesson-toc-sections";

function resolveSection(id: string, statuses: LessonStatus[], activeLesson = "") {
  const section: Section = {
    id,
    title: id,
    lessons: statuses.map((_, index) => ({
      id: `${id}-${index}`,
      title: `教材 ${index + 1}`,
      type: "text",
      duration: "3分",
      status: "todo",
    })),
  };
  const resolvedStatuses = new Map(
    section.lessons.map((lesson, index) => [lesson.id, statuses[index]]),
  );
  return resolveLessonTocSection(
    section,
    (lesson) => resolvedStatuses.get(lesson.id) ?? "todo",
    activeLesson,
  );
}

describe("目次のセクション", () => {
  it("現在地は完了・進行中・未着手より優先し、全教材が完了したかも分かる", () => {
    expect(resolveSection("unit", ["done", "done"], "unit-0")).toMatchObject({
      status: "current",
      doneCount: 2,
      allDone: true,
    });
    expect(resolveSection("unit", ["done", "todo"], "unit-1")).toMatchObject({
      status: "current",
      doneCount: 1,
      allDone: false,
    });
    expect(resolveSection("unit", ["todo"], "unit-0")).toMatchObject({
      status: "current",
      doneCount: 0,
      allDone: false,
    });
  });

  it("解決済みの教材の状態から完了数とセクションの状態を判定する", () => {
    expect(resolveSection("unit", ["done", "done"])).toMatchObject({
      status: "done",
      doneCount: 2,
      allDone: true,
    });
    expect(resolveSection("unit", ["done", "locked"])).toMatchObject({
      status: "progress",
      doneCount: 1,
      allDone: false,
    });
    expect(resolveSection("unit", ["active", "todo"]).status).toBe("untouched");
    expect(resolveSection("unit", ["locked"]).status).toBe("untouched");
  });

  const current = resolveSection("current", ["todo"], "current-0");
  const done = resolveSection("done", ["done"]);
  const progress = resolveSection("progress", ["done", "todo"]);
  const untouched = resolveSection("untouched", ["todo"]);
  const sections = [current, done, progress, untouched];

  it("既定では現在地と進行中だけ開く", () => {
    expect(sections.map((section) => isLessonTocSectionOpen(section, {}))).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("手で変更した開閉を優先し、現在地は閉じない", () => {
    const overrides = { current: false, done: true, progress: false, untouched: true };
    expect(sections.map((section) => isLessonTocSectionOpen(section, overrides))).toEqual([
      true,
      true,
      false,
      true,
    ]);
    const left = resolveSection("current", ["done", "todo"], "done-0");
    expect(isLessonTocSectionOpen(left, {})).toBe(true);
    expect(isLessonTocSectionOpen(left, overrides)).toBe(false);
  });

  it("現在地以外を一括で開閉し、現在地の以前の指定を保つ", () => {
    const opened = setAllLessonTocSectionsOpen(sections, { current: false }, true);
    expect(opened).toEqual({ current: false, done: true, progress: true, untouched: true });
    expect(summarizeLessonTocSections(sections, opened).allOpen).toBe(true);

    const closed = setAllLessonTocSectionsOpen(sections, opened, false);
    expect(closed).toEqual({ current: false, done: false, progress: false, untouched: false });
    expect(summarizeLessonTocSections(sections, closed).allOpen).toBe(false);
    expect(sections.map((section) => isLessonTocSectionOpen(section, closed))).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it("集計では現在地を完了または進行中に数える", () => {
    expect(summarizeLessonTocSections(sections, {})).toEqual({
      done: 1,
      progress: 2,
      untouched: 1,
      allOpen: false,
    });
    const completedCurrent = resolveSection("current", ["done"], "current-0");
    expect(summarizeLessonTocSections([completedCurrent], {})).toEqual({
      done: 1,
      progress: 0,
      untouched: 0,
      allOpen: true,
    });
  });
});
