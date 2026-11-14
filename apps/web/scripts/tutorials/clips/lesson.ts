import { defineClip } from "../lib/clips";
import { openEntryStage } from "../lib/scenario-navigation";
export default defineClip({
  id: "web/read-lesson",
  user: "seed-learner",
  regions: { slides: "[data-testid=lesson-slides]" },
  async run(t) {
    await openEntryStage(t);
    await t.mark("open-lesson", async () => {
      await t.click("[data-testid=stage-lesson-slides]");
      await t.expect("[data-testid=lesson-slides]");
      await t.wait(1200);
    });
    await t.mark("next-slide", async () => {
      await t.click("[data-testid=lesson-next-slide]");
      await t.expect("[data-testid=lesson-slides][data-page='2']");
      await t.wait(1500);
    });
  },
});
