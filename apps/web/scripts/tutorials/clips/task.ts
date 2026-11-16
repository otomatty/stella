import { defineClip } from "../lib/clips";
import { openFirstTask } from "../lib/scenario-navigation";
export default defineClip({
  id: "web/open-task",
  regions: { handoff: "[data-testid=lesson-task-handoff]", open: "[data-testid=open-in-vscode]" },
  async run(t) {
    await openFirstTask(t);
    await t.mark("press-open", async () => {
      await t.locate("[data-testid=lesson-task-handoff]").scrollIntoViewIfNeeded();
      await t.wait(600);
      await t.pretendClick("[data-testid=open-in-vscode]");
      await t.wait(800);
    });
  },
});
