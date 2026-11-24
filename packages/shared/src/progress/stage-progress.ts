export function stageProgressPercent({
  completed,
  lessonsTotal,
  lessonsDone,
  tasksTotal,
  tasksPassed,
}: {
  completed: boolean;
  lessonsTotal: number;
  lessonsDone: number;
  tasksTotal: number;
  tasksPassed: number;
}): number {
  if (completed) return 100;
  if (lessonsTotal === 0) return 0;
  const tasks = Math.max(tasksTotal, 0);
  const done = lessonsDone + Math.min(Math.max(tasksPassed, 0), tasks);
  const total = lessonsTotal + tasks;
  return done >= total ? 100 : Math.min(Math.floor((done / total) * 100), 99);
}
