import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
vi.mock("./lib/narration-topics.js", async (original) => ({
  ...(await original<typeof import("./lib/narration-topics.js")>()),
  collectNarrationTopics: vi.fn(),
  validateTopic: vi.fn(),
}));
import {
  collectNarrationTopics,
  validateTopic,
  type NarrationTopic,
} from "./lib/narration-topics.js";

it("video.json があれば、壊れた旧台本の parseError も内容の検査も飛ばす", async () => {
  const root = mkdtempSync(join(tmpdir(), "stella-check-narration-"));
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const exit = vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("unexpected exit");
  });
  try {
    writeFileSync(join(root, "video.json"), "{}");
    vi.mocked(collectNarrationTopics).mockReturnValue([
      { topicDir: root, parseError: "invalid JSON", takeaway: "動画で流れを確かめます。" },
      { topicDir: root, narration: {}, takeaway: "動画で流れを確かめます。" },
    ] as NarrationTopic[]);
    await import("./check-narration.js");
    expect(validateTopic).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("narration: 2 topics checked (0 errors, 0 warnings)");
  } finally {
    log.mockRestore();
    exit.mockRestore();
    rmSync(root, { recursive: true, force: true });
  }
});
