import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "smoke",
  order: 0,
  screen: "/",
  title: "収録の確認",
  summary: "ホーム画面で字幕と録画の動作を確かめます。",
  start: "/",
  user: "seed-learner2",
  draft: true,
  async run(t) {
    await t.caption("STELLA のホーム画面です。");
    await t.expect("body");
    await t.caption("ここから学習を始められます。");
    await t.expect("body");
  },
});
