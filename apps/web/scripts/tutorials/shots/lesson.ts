import { openFirstSlides } from "../lib/scenario-navigation";
import { defineShots } from "../lib/shots";

export default defineShots({
  id: "lesson",
  user: "seed-learner",
  async run(t, shot) {
    await openFirstSlides(t);
    await t.click("[data-testid=lesson-next-slide]");
    await t.expect("[data-testid=lesson-slides][data-page='2']");
    await shot("web/lesson-slides", { regions: { slides: "[data-testid=lesson-slides]" } });
    await t.click("[data-testid=lesson-toc-quiz]");
    await t.expect("[data-testid=quiz-question]");
    await shot("web/quiz", { regions: { question: "[data-testid=quiz-question]" } });
  },
});
