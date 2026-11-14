import { defineClip } from "../lib/clips";
import { REVIEW_RESULT_SEED_SQL } from "../lib/review-result-seed";
import { openFirstTask } from "../lib/scenario-navigation";
export default defineClip({
  id: "web/read-result",
  seedSql: REVIEW_RESULT_SEED_SQL,
  regions: { submissions: "[data-testid=submissions-history]" },
  async run(t) {
    await openFirstTask(t);
    await t.mark("open-submissions", async () => {
      await t.locate("[data-testid=submissions-toggle]").scrollIntoViewIfNeeded();
      await t.wait(600);
      await t.click("[data-testid=submissions-toggle]");
      await t.expect("[data-testid=submissions-list]");
      await t.wait(1500);
    });
  },
});
