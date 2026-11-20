import type { Lesson } from "@/data/types";

export function isVideoLesson(lesson: Pick<Lesson, "type" | "videoPath">): boolean {
  return (lesson.type === "video" || lesson.type === "slides") && Boolean(lesson.videoPath);
}

export function displayLessonType(lesson: Pick<Lesson, "type" | "videoPath">): Lesson["type"] {
  return isVideoLesson(lesson) ? "video" : lesson.type;
}

export function nextLessonMeta(typeLabel: string, duration: string | undefined): string {
  return duration ? `${typeLabel} · ${duration}` : typeLabel;
}
