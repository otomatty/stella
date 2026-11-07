import { expect, it } from "vitest";
import { staleTutorials } from "./check";

it("未収録・変更・ナレーションなしを判定する", () => {
  expect(
    staleTutorials(
      [
        { id: "missing", sourceHash: "a" },
        { id: "changed", sourceHash: "a" },
        { id: "silent", sourceHash: "a" },
        { id: "current", sourceHash: "a" },
      ],
      [
        { id: "changed", sourceHash: "b", narration: true },
        { id: "silent", sourceHash: "a", narration: false },
        { id: "current", sourceHash: "a", narration: true },
      ],
    ),
  ).toEqual([
    "missing（未収録）",
    "changed（画面かシナリオが変わっています）",
    "silent（ナレーションなし）",
  ]);
});
it("draft を収録済みかどうかにかかわらず数えない", () => {
  const scenarios = [{ id: "draft", sourceHash: "new", draft: true }];
  expect(staleTutorials(scenarios, [])).toEqual([]);
  expect(staleTutorials(scenarios, [{ id: "draft", sourceHash: "old" }])).toEqual([]);
});
