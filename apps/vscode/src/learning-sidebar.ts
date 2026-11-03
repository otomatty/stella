import { TASK_STATUS_LABELS } from "@stella/shared/tasks/catalog";
import type { CatalogLesson, CatalogSection, CatalogStage } from "./catalog.js";

export interface LearningSelection {
  stageId?: string;
  sectionId?: string;
  lessonId?: string;
  taskId?: string;
}

export function learningItemComplete(lesson: CatalogLesson): boolean {
  return lesson.task
    ? lesson.task.status === "passed" || lesson.task.status === "ai-passed"
    : lesson.completed;
}

function awaitingReview(lesson: CatalogLesson): boolean {
  return lesson.task?.status === "submitted" || lesson.task?.status === "instructor-pending";
}

export function resolveLearningLocation(
  catalog: readonly CatalogStage[],
  selection: LearningSelection,
): { stage?: CatalogStage; section?: CatalogSection; lesson?: CatalogLesson } {
  // Web から開いた課題は、ウィンドウの読み込み直し後もその単元へ寄せる。
  const targetStage = catalog.find((stage) =>
    stage.sections.some((section) =>
      section.lessons.some((lesson) =>
        selection.taskId
          ? lesson.task?.id === selection.taskId
          : stage.id === selection.stageId && lesson.id === selection.lessonId,
      ),
    ),
  );
  const stage =
    targetStage ??
    catalog.find((item) => item.id === selection.stageId) ??
    catalog.find((item) =>
      item.sections.some((section) =>
        section.lessons.some((lesson) => !learningItemComplete(lesson)),
      ),
    ) ??
    catalog[0];
  const targetSection = targetStage?.sections.find((section) =>
    section.lessons.some((lesson) =>
      selection.taskId ? lesson.task?.id === selection.taskId : lesson.id === selection.lessonId,
    ),
  );
  const section =
    targetSection ??
    stage?.sections.find((item) => item.id === selection.sectionId) ??
    stage?.sections.find((item) => item.lessons.some((lesson) => !learningItemComplete(lesson))) ??
    stage?.sections[0];
  const lesson = section?.lessons.find((item) =>
    selection.taskId ? item.task?.id === selection.taskId : item.id === selection.lessonId,
  );
  return { stage, section, lesson };
}

export function nextLearningItem(section: CatalogSection): CatalogLesson | undefined {
  const remaining = section.lessons.filter((lesson) => !learningItemComplete(lesson));
  return remaining.find((lesson) => !awaitingReview(lesson)) ?? remaining[0];
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function itemKind(lesson: CatalogLesson): string {
  if (lesson.task) return "課題";
  return {
    text: "まとめ",
    slides: "スライド",
    code: "演習",
    quiz: "確認クイズ",
    video: "動画",
    assignment: "課題",
  }[lesson.type];
}

function opensInWeb(lesson: CatalogLesson): boolean {
  return !lesson.task && ["quiz", "video", "assignment"].includes(lesson.type);
}

function itemStatus(lesson: CatalogLesson): string {
  if (lesson.task) return TASK_STATUS_LABELS[lesson.task.status];
  return lesson.completed ? "完了" : "未完了";
}

function lessonButton(lesson: CatalogLesson, title: string, primary = false): string {
  const action = awaitingReview(lesson) ? "review" : "open";
  return `<button type="button"${primary ? ' id="next-step-action"' : ""} class="${primary ? "primary" : ""}" data-action="${action}" data-lesson="${escapeHtml(lesson.id)}">${escapeHtml(title)}</button>`;
}

function nextStep(stage: CatalogStage, section: CatalogSection): string {
  const next = nextLearningItem(section);
  if (next) {
    const waiting = awaitingReview(next);
    const title = waiting ? "レビューの状況" : "次にやること";
    const description = waiting
      ? "提出した課題の確認が終わると、Web に結果が届きます。"
      : next.task
        ? "編集するファイルと課題文を並べて開きます。"
        : opensInWeb(next)
          ? "ブラウザーの STELLA で進めます。終わったら、この画面に戻れます。"
          : "VS Code で開いて進めます。";
    const label = waiting
      ? "Web で状況を見る"
      : next.task
        ? next.task.status === "local-passed"
          ? "課題を開いて提出する"
          : "課題に取り組む"
        : opensInWeb(next)
          ? "Web で進める"
          : "教材を開く";
    return `<section class="next-step" aria-labelledby="next-title"><p class="eyebrow">${title}</p><h2 id="next-title">${escapeHtml(next.title)}</h2><p class="hint">${description}</p>${lessonButton(next, label, true)}</section>`;
  }
  const index = stage.sections.indexOf(section);
  const nextSection = stage.sections.slice(index + 1).find((item) => item.lessons.length > 0);
  return `<section class="next-step" aria-labelledby="next-title"><p class="eyebrow">この単元の教材・課題は完了</p><h2 id="next-title">${nextSection ? escapeHtml(nextSection.title) : "学習の状況を確認しましょう"}</h2>${nextSection ? `<button type="button" class="primary" data-action="section" data-section="${escapeHtml(nextSection.id)}">次の単元へ</button>` : '<button type="button" class="primary" data-action="home">Web で学習マップを開く</button>'}</section>`;
}

function catalogContent(catalog: readonly CatalogStage[], selection: LearningSelection): string {
  const { stage, section, lesson: current } = resolveLearningLocation(catalog, selection);
  if (!stage) {
    return '<section class="empty"><h1>学習を始めましょう</h1><p>Web の学習マップでステージを始めると、教材がここに並びます。</p><button type="button" class="primary" data-action="home">学習マップを開く</button></section>';
  }
  const stageOptions = catalog
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}"${item.id === stage.id ? " selected" : ""}>${escapeHtml(item.title)}</option>`,
    )
    .join("");
  const stageSelector = `<label class="field-label" for="stage">ステージ</label><select id="stage" data-select="stage">${stageOptions}</select>`;
  if (!section)
    return `${stageSelector}<p class="empty">このステージには、まだ教材がありません。</p>`;
  const completed = section.lessons.filter(learningItemComplete).length;
  const sectionOptions = stage.sections
    .map(
      (item, index) =>
        `<option value="${escapeHtml(item.id)}"${item.id === section.id ? " selected" : ""}>${String(index + 1).padStart(2, "0")}　${escapeHtml(item.title)}</option>`,
    )
    .join("");
  const lessons = section.lessons
    .map((lesson, index) => {
      const done = learningItemComplete(lesson);
      const active = current?.id === lesson.id;
      return `<li class="lesson${done ? " done" : ""}${active ? " current" : ""}"><button type="button" id="lesson-${index}" class="lesson-link" data-action="open" data-lesson="${escapeHtml(lesson.id)}"${active ? ' aria-current="page"' : ""}><span class="step-number" aria-hidden="true">${done ? "✓" : String(index + 1).padStart(2, "0")}</span><span class="lesson-copy"><span class="lesson-title">${escapeHtml(lesson.title)}</span><span class="lesson-meta"><span>${itemKind(lesson)}</span><span>${escapeHtml(itemStatus(lesson))}</span>${opensInWeb(lesson) ? '<span class="web-label">Web で受講 ↗</span>' : ""}${active ? '<span class="current-label">いま開いている教材</span>' : ""}</span></span></button></li>`;
    })
    .join("");
  return `${stageSelector}<label class="field-label unit-label" for="section">単元 ${stage.sections.indexOf(section) + 1} / ${stage.sections.length}</label><select id="section" data-select="section">${sectionOptions}</select><div class="progress-caption"><span>この単元の進み具合</span><span>${completed} / ${section.lessons.length} 完了</span></div><progress max="${Math.max(1, section.lessons.length)}" value="${completed}" aria-label="この単元の完了数"></progress>${section.lessons.length ? nextStep(stage, section) : '<p class="empty">この単元には、まだ教材がありません。</p>'}<section aria-labelledby="lessons-title"><div class="list-heading"><h2 id="lessons-title">この単元の教材</h2><span>${section.lessons.length} 件</span></div><ol class="lessons">${lessons}</ol></section>`;
}

export type LearningSidebarState =
  | { kind: "loading" }
  | { kind: "disconnected" }
  | { kind: "error"; message: string }
  | { kind: "catalog"; catalog: readonly CatalogStage[]; selection: LearningSelection };

export interface LearningSidebarAssets {
  nonce: string;
  cspSource: string;
  styleUri: string;
  scriptUri: string;
}

function loadingContent(): string {
  // 行の高さは通常表示と共通にし、文字の形だけを細いプレースホルダーに置き換える。
  const line = (size: string) =>
    `<span class="loading-line loading-${size}"><span class="skeleton"></span></span>`;
  const lessons = Array.from(
    { length: 4 },
    (_, index) =>
      `<li class="lesson loading-lesson${index === 3 ? " loading-active" : ""}"><div class="lesson-link"><span class="step-number skeleton"></span><span class="lesson-copy"><span class="lesson-title">${line("title")}</span><span class="lesson-meta">${line("kind")}${line("status")}${index === 2 ? line("web") : ""}${index === 3 ? `<span class="current-label">${line("current")}</span>` : ""}</span></span></div></li>`,
  ).join("");
  const selector = (unit: boolean) =>
    `<div class="loading-select">${unit ? line("number") : ""}${line(unit ? "unit" : "stage")}<span class="loading-chevron"></span></div>`;
  return `<p class="sr-only" role="status">学習の状況を読み込んでいます…</p><div class="loading-layout" aria-hidden="true"><div class="field-label">ステージ</div>${selector(false)}<div class="field-label unit-label">単元</div>${selector(true)}<div class="progress-caption"><span>この単元の進み具合</span>${line("count")}</div><div class="skeleton loading-progress"></div><section class="next-step loading-next-step"><div class="eyebrow">${line("eyebrow")}</div><h2>${line("heading")}</h2><div class="hint">${line("description")}${line("description-short")}</div><div class="primary loading-button">${line("button")}</div></section><section><div class="list-heading"><h2>この単元の教材</h2>${line("total")}</div><ol class="lessons">${lessons}</ol></section></div>`;
}

export function renderLearningSidebar(
  state: LearningSidebarState,
  assets: LearningSidebarAssets,
): string {
  let content: string;
  switch (state.kind) {
    case "loading":
      content = loadingContent();
      break;
    case "disconnected":
      content =
        '<section class="empty"><p class="eyebrow">STELLA の学習ガイド</p><h1>教材を読み、課題に取り組む</h1><p>Web の課題で「VS Code で開く」を押すと接続できます。接続後は、この場所で単元の進み具合や次にやることを確認できます。</p><button type="button" class="primary" data-action="connect">Web で接続する</button></section>';
      break;
    case "error":
      content = `<section class="empty" role="status"><h1>教材を読み込めませんでした</h1><p>${escapeHtml(state.message)}</p><button type="button" class="primary" data-action="refresh">もう一度読み込む</button></section>`;
      break;
    case "catalog":
      content = catalogContent(state.catalog, state.selection);
      break;
  }
  const nonce = escapeHtml(assets.nonce);
  const location =
    state.kind === "catalog" ? resolveLearningLocation(state.catalog, state.selection) : undefined;
  const scope = escapeHtml(JSON.stringify([location?.stage?.id, location?.section?.id]));
  const footer =
    state.kind === "loading"
      ? '<footer class="loading-footer" aria-hidden="true"><span class="text-button"><span class="loading-line loading-map"><span class="skeleton"></span></span></span><span class="text-button"><span class="loading-line loading-reload"><span class="skeleton"></span></span></span></footer>'
      : '<footer><button type="button" id="open-map" class="text-button" data-action="home">Web の学習マップ ↗</button><button type="button" id="reload" class="text-button" data-action="refresh">再読み込み</button></footer>';
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${escapeHtml(assets.cspSource)}; script-src 'nonce-${nonce}';"><title>STELLA 学習ガイド</title><link rel="stylesheet" href="${escapeHtml(assets.styleUri)}"></head><body data-message-token="${nonce}" data-scope="${scope}"><main aria-busy="${state.kind === "loading"}">${content}</main>${footer}<script nonce="${nonce}" src="${escapeHtml(assets.scriptUri)}"></script></body></html>`;
}
