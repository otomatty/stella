import { openFirstTask } from "../lib/scenario-navigation";
import { defineShots } from "../lib/shots";

export default defineShots({
  id: "task",
  async run(t, shot) {
    await openFirstTask(t);
    await shot("web/task", {
      regions: {
        handoff: "[data-testid=lesson-task-handoff]",
        open: "[data-testid=open-in-vscode]",
        doc: "[data-testid=lesson-doc]",
      },
      clipRegions: ["doc"],
    });
  },
});
