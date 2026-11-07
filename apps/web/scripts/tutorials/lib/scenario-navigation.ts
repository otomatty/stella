import type { Director } from "./director";

// UUID を書き写さず、実際の目次・課題一覧からレッスンを開く。
export async function openEntryStage(t: Director) {
  await t.goto("/");
  await t.expect("[data-testid=tree-star-dev-env-basics]");
  await t.click("[data-testid=tree-star-dev-env-basics]");
  await t.expect("[data-testid=tree-open-stage]");
  await t.click("[data-testid=tree-open-stage]");
  await t.expect("[data-testid=stage-syllabus]");
  await t.expectUrl(/\/stages\/[^/]+$/);
}

export async function openFirstSlides(t: Director) {
  await openEntryStage(t);
  await t.click("[data-testid=stage-lesson-slides]");
  await t.expect("[data-testid=lesson-slides]");
  await t.expectUrl(/\/stages\/[^/]+\/lessons\/[^/]+$/);
}

export async function openFirstTask(t: Director) {
  await openEntryStage(t);
  const task = t.locate(
    '[data-testid=stage-task][data-task-id="dev-env-basics/u02-first-task/q01-first-page"]',
  );
  await t.expect(task);
  const lessonId = await task.getAttribute("data-lesson-id");
  if (!lessonId) throw new Error("最初の課題に課題文レッスンがありません");
  await t.click(`[data-testid=stage-lesson-text][data-lesson-id="${lessonId}"]`);
  await t.expect("[data-testid=lesson-doc]");
  await t.expect("[data-testid=lesson-task-handoff]");
  await t.expect("[data-testid=open-in-vscode]");
}

// 強調 API はスクロールしないので、光らせる前に画面へ入れる。
export async function show(t: Director, selector: string) {
  await t.expect(selector);
  await t.locate(selector).first().scrollIntoViewIfNeeded();
  await t.highlight(selector);
  await t.expect(selector);
}
