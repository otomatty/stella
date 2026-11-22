import { useMemo } from "react";
import { problemLessonsById } from "@/lib/problem-lesson";
import { stageWrapupOf } from "@/lib/stage-wrapup";
import { useStageTasks } from "./useStageTasks";

/** ホームのレッスン案内と仕上げで、同じ課題一覧を使う。 */
export function useStageWrapup(stageId: string | null) {
  const tasks = useStageTasks(stageId ?? "", stageId !== null);
  return useMemo(
    () => ({
      problemLessons: problemLessonsById(tasks),
      wrapup: tasks ? stageWrapupOf(tasks) : null,
    }),
    [tasks],
  );
}
