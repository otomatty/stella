import type { CatalogStage } from "../../src/catalog.js";
import { type LearningSidebarAssets, renderLearningSidebar } from "../../src/learning-sidebar.js";
import {
  initialSubmissionDraft,
  renderSubmissionForm,
  type SubmissionFormInput,
} from "../../src/submission-form-view.js";

interface VSCodeShot {
  description: string;
  viewport: { width: number; height: number };
  media: { style: string; script: string };
  html: (assets: LearningSidebarAssets) => string;
  target?: string;
  highlight?: string;
}

const catalog: CatalogStage[] = [
  {
    id: "html-css-basics",
    title: "HTML・CSS の基礎",
    sections: [
      {
        id: "html-structure",
        title: "HTML 文書の構造",
        lessons: [
          {
            id: "html-intro",
            stageId: "html-css-basics",
            title: "HTML の役割",
            type: "video",
            completed: true,
          },
          {
            id: "html-elements",
            stageId: "html-css-basics",
            title: "見出しと段落のまとめ",
            type: "text",
            completed: true,
          },
          {
            id: "first-page",
            stageId: "html-css-basics",
            title: "自己紹介ページを作る",
            type: "text",
            completed: false,
            task: { id: "first-page-task", status: "not-started" },
          },
        ],
      },
    ],
  },
];

const submission: SubmissionFormInput = {
  key: "first-page-task",
  title: "自己紹介ページを作る",
  mode: "submit",
};

export const vscodeShots = {
  "submission-form": {
    description: "課題を提出する前に振り返りを書くフォーム",
    viewport: { width: 900, height: 600 },
    media: { style: "submission-form.css", script: "submission-form.js" },
    html: (assets) => renderSubmissionForm(submission, initialSubmissionDraft(submission), assets),
    highlight: ".action-bar",
  },
  "learning-sidebar": {
    description: "ステージと単元を読み込んだ学習ガイド",
    viewport: { width: 360, height: 800 },
    media: { style: "learning-sidebar.css", script: "learning-sidebar.js" },
    html: (assets) =>
      renderLearningSidebar(
        { kind: "catalog", catalog, selection: { lessonId: "html-elements" } },
        assets,
      ),
  },
} satisfies Record<string, VSCodeShot>;

export function getVSCodeShot(name: string): VSCodeShot {
  if (!Object.hasOwn(vscodeShots, name)) throw new Error(`未登録の VS Code 撮影場面: ${name}`);
  return vscodeShots[name as keyof typeof vscodeShots];
}
