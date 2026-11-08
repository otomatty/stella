import { describe, expect, it } from "vitest";
import { parseOsBlocks } from "./os-blocks";
import { parseTutorialBlocks, replaceTutorialBlocks } from "./tutorial-blocks";

describe("tutorial blocks", () => {
  it("splits one-line references at their original position", () => {
    expect(parseTutorialBlocks("before\r\n:::tutorial overview\r\nafter")).toEqual({
      segments: [
        { kind: "markdown", markdown: "before", line: 1 },
        { kind: "tutorial", id: "overview", line: 2 },
        { kind: "markdown", markdown: "after", line: 3 },
      ],
      issues: [],
    });
  });
  it.each(["", "Overview", "../overview", "two words", "a_1"])(
    "reports invalid id %s without losing text",
    (id) => {
      const source = `:::tutorial ${id}`;
      const parsed = parseTutorialBlocks(source);
      expect(parsed.issues).toHaveLength(1);
      expect(parsed.segments).toEqual([{ kind: "markdown", markdown: source, line: 1 }]);
    },
  );
  it("works inside OS blocks without OS diagnostics", () => {
    const source =
      ":::os windows\n:::tutorial overview\n:::\n:::os macos\n:::tutorial overview\n:::";
    expect(parseOsBlocks(source).issues).toEqual([]);
    expect(parseTutorialBlocks(source).segments.filter((s) => s.kind === "tutorial")).toHaveLength(
      2,
    );
  });
  it("leaves fenced and indented code examples untouched", () => {
    const source =
      "````md\n:::tutorial overview\n```\n:::tutorial nope\n````\n~~~\n:::tutorial demo\n~~~\n    :::tutorial example";
    expect(parseTutorialBlocks(source).segments).toEqual([
      { kind: "markdown", markdown: source, line: 1 },
    ]);
    expect(replaceTutorialBlocks(source, () => "REPLACED")).toBe(source);
  });
});
