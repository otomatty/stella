import { REVIEW_RESULT_SEED_SQL } from "../lib/review-result-seed";
import { openFirstTask } from "../lib/scenario-navigation";
import { defineShots } from "../lib/shots";

export default defineShots({
  id: "submissions",
  seedSql: REVIEW_RESULT_SEED_SQL,
  async run(t, shot) {
    await openFirstTask(t);
    await t.locate("[data-testid=submissions-toggle]").scrollIntoViewIfNeeded();
    await t.click("[data-testid=submissions-toggle]");
    await t.expect("[data-testid=submissions-list]");
    await shot("web/submissions", {
      regions: { submissions: "[data-testid=submissions-history]" },
    });
  },
});
