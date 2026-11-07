import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkTutorialBlocks, checkTutorialSource } from "./tutorial-blocks-check";
const scenarios = new Set(["overview"]);
const recorded = new Set(["overview"]);
describe("tutorial content checks", () => {
  it("rejects missing scenarios, warns about unrecorded videos and rejects slides", () => {
    expect(
      checkTutorialSource("doc.md", ":::tutorial missing", true, scenarios, recorded)[0]?.severity,
    ).toBe("error");
    expect(
      checkTutorialSource("doc.md", ":::tutorial overview", true, scenarios, new Set())[0]
        ?.severity,
    ).toBe("warning");
    expect(
      checkTutorialSource("slides.md", ":::tutorial overview", false, scenarios, recorded)[0]
        ?.severity,
    ).toBe("error");
    expect(
      checkTutorialSource("doc.md", ":::tutorial overview", true, scenarios, recorded),
    ).toEqual([]);
    expect(
      checkTutorialSource(
        "slides.md",
        "```\n:::tutorial overview\n```",
        false,
        scenarios,
        recorded,
      ),
    ).toEqual([]);
  });
  it("walks materials and checks scenarios even when there is no manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "stella-tutorial-"));
    try {
      const modules = join(root, "stages/demo/modules");
      mkdirSync(join(modules, "u01/topic"), { recursive: true });
      mkdirSync(join(root, "scenarios"));
      writeFileSync(join(root, "scenarios/overview.ts"), 'export default { id: "overview" };');
      writeFileSync(join(modules, "u01/topic/doc.md"), ":::tutorial overview");
      writeFileSync(join(modules, "u01/topic/slides.md"), ":::tutorial overview");
      const results = checkTutorialBlocks(
        join(root, "stages"),
        join(root, "scenarios"),
        join(root, "manifest.json"),
      );
      expect(results.map((d) => d.severity).sort()).toEqual(["error", "warning"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
