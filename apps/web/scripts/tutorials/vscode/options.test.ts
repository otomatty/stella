import { expect, it } from "vitest";
import { recordingOptions, selectsScenario } from "./options";

it("keeps clip scenarios out of ordinary recordings and selects clips by partial id", () => {
  const normal = { id: "submit" };
  const clip = { id: "submit", clip: "vscode/submit" };
  expect(selectsScenario(normal, recordingOptions([]))).toBe(true);
  expect(selectsScenario(clip, recordingOptions([]))).toBe(false);
  const options = recordingOptions(["--", "--clip", "submit"]);
  expect(options.noNarration).toBe(true);
  expect(options.save).toBe(false);
  expect(selectsScenario(normal, options)).toBe(false);
  expect(selectsScenario(clip, options)).toBe(true);
  expect(selectsScenario({ ...clip, clip: "vscode/open-task" }, options)).toBe(false);
});
it("retains legacy filters and flags", () => {
  const options = recordingOptions(["--no-narration", "--keep-frames", "run-check"]);
  expect(options).toMatchObject({ noNarration: true, keepFrames: true });
  expect(selectsScenario({ id: "run-check" }, options)).toBe(true);
  expect(selectsScenario({ id: "edit-save" }, options)).toBe(false);
  expect(recordingOptions(["--save"]).save).toBe(true);
});
it("rejects ambiguous output modes, missing clip filters and unsafe ids", () => {
  for (const args of [
    ["--clip"],
    ["--clip", "--save"],
    ["--clip", "submit", "--save"],
    ["--save", "--no-narration"],
    ["--unknown"],
    ["--clip", "x", "--clip", "y"],
  ])
    expect(() => recordingOptions(args)).toThrow();
  expect(() =>
    selectsScenario({ id: "x", clip: "../escape" }, recordingOptions(["--clip", "escape"])),
  ).toThrow();
});
