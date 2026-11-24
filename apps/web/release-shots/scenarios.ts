import type { Locator, Page } from "playwright/test";

interface WebShot {
  description: string;
  profile: "seed-learner" | "seed-learner2" | "seed-admin";
  path: string;
  ready: (page: Page) => Promise<void>;
  target?: (page: Page) => Locator;
  highlight?: (page: Page) => Locator;
}

const lessonScreen = (page: Page) => page.getByTestId("lesson-screen");

// dev-env-basics の U00「00-1 まとめ」のシード行 (e2e/lesson.spec.ts と同じ)。
const stageId = "77e54045-9e80-530d-8952-7aa6a7ba5938";
const lessonId = "1b5d3229-5c04-536c-8ff8-5d8113681cc5";

export const webShots = {
  "learner-home": {
    description: "受講者のホームに表示されるステージ一覧と学習ガイド",
    profile: "seed-learner",
    path: "/",
    async ready(page) {
      await page.getByRole("region", { name: "あなたの状況" }).waitFor();
      await page.getByRole("complementary", { name: "次にやること" }).waitFor();
      await page.getByRole("button", { name: "全体を表示" }).waitFor();
      await page.getByTestId("tree-star-dev-env-basics").waitFor();
    },
  },
  "lesson-summary": {
    description: "「STELLAの使い方」のレッスン「00-1 まとめ」",
    profile: "seed-learner",
    path: `/stages/${stageId}/lessons/${lessonId}`,
    async ready(page) {
      const lesson = lessonScreen(page);
      await lesson.getByRole("heading", { name: "00-1 まとめ", exact: true }).waitFor();
      await lesson.getByTestId("lesson-doc").getByText("このレッスンの目標").waitFor();
      await lesson.getByRole("tab", { name: /^資料/ }).getByText(/^\d+$/).waitFor();
    },
  },
} satisfies Record<string, WebShot>;

export function getWebShot(name: string): WebShot {
  if (!Object.hasOwn(webShots, name)) throw new Error(`未登録の Web 撮影場面: ${name}`);
  return webShots[name as keyof typeof webShots];
}
