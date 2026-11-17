import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { GUIDE_ADDRESSES, guideAddress } from "./storyboard-assets.js";
import { viewTransition } from "./scene-timeline.js";

it("全9章のアドレスを README の公開先と照合し source から選ぶ", () => {
  const readme = readFileSync(
    new URL("../../../docs/devlab-ts-prework-guide/README.md", import.meta.url),
    "utf8",
  );
  const rows = [...readme.matchAll(/\| (0[1-9])章 .*?\(https:\/\/([^)]*)\)/g)];
  expect(rows).toHaveLength(9);
  expect(Object.keys(GUIDE_ADDRESSES)).toHaveLength(9);
  for (const [, chapter, address] of rows)
    expect(guideAddress(`docs/devlab-ts-prework-guide/pages/guide-${chapter}.html`)).toBe(address);
  expect(() => guideAddress("guide-10.html")).toThrow("章");
  expect(() => guideAddress(undefined)).toThrow("章");
});
it.each([
  ["clip:guide/a#one", "clip:web/b#two", 0.4],
  ["clip:web/b#two", "clip:guide/a#one", 0.4],
  ["shot:web/b", "clip:guide/a#one", 0.4],
  ["clip:guide/a#one", "clip:vscode/b#two", 1],
  ["clip:vscode/b#two", "clip:guide/a#one", 1],
  ["clip:guide/a#one", "clip:guide/b#two", 0.4],
] as const)("窓の切り替え %s → %s", (from, to, seconds) => {
  expect(viewTransition(from, to)).toBe(seconds);
});
