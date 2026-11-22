import { expect, it } from "vitest";
import { motionComponents } from "./index";
import { MOTIONS } from "./manifest";

it("動きの台帳と描画部品の ID が一致する", () => {
  expect(Object.keys(motionComponents).sort()).toEqual(Object.keys(MOTIONS).sort());
});

it("設計上の長さを読み上げ文ごとに定めている", () => {
  for (const { title, beats, seconds } of Object.values(MOTIONS)) {
    expect(seconds, title).toHaveLength(beats);
    expect(
      seconds.every((duration) => Number.isFinite(duration) && duration > 0),
      title,
    ).toBe(true);
  }
});
