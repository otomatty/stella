import { describe, expect, it } from "vitest";
import { figureBatches } from "./book-figures";
const figures = (count: number) =>
  JSON.stringify(
    Array.from({ length: count }, (_, n) => ({
      fileName: `figure-${n}.webp`,
      box: [1, 1, 10, 10],
      caption: "Figure",
    })),
  );
describe("book figure budgets", () => {
  it("groups 1000 illustrated pages within the Workflow step cap", () => {
    const batches = figureBatches(
      Array.from({ length: 1000 }, (_, n) => ({ page_no: n + 1, ocr_figures: figures(1) })),
    );
    expect(batches.length).toBeLessThan(200);
    expect(batches.flat()).toHaveLength(1000);
    for (const batch of batches)
      expect(
        1 + batch.reduce((sum, task) => sum + 4 * (task.figures.length + Number(task.complete)), 0),
      ).toBeLessThanOrEqual(49);
  });
  it("splits a dense page without marking a partially saved page complete", () => {
    const batches = figureBatches([{ page_no: 1, ocr_figures: figures(24) }]);
    expect(batches.flat().map((task) => task.complete)).toEqual([false, false, true]);
    expect(batches.flatMap((batch) => batch.flatMap((task) => task.figures))).toHaveLength(24);
    for (const batch of batches)
      expect(
        1 + batch.reduce((sum, task) => sum + 4 * (task.figures.length + Number(task.complete)), 0),
      ).toBeLessThanOrEqual(49);
  });
});
