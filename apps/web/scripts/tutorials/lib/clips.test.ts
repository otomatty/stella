import { describe, expect, it, vi } from "vitest";
import type { Page } from "playwright";
import { ClipMarks, clipMetadata, defineClip } from "./clips";
import { Director } from "./director";
import type { ScreenRecorder } from "./recorder";

const definition = {
  id: "web/lesson",
  regions: { slides: "#slides" },
  async run() {
    /* 定義の検査だけを行う。 */
  },
};
describe("clip definitions and metadata", () => {
  it("accepts definitions and rejects invalid paths, selectors, seeds and users", () => {
    expect(defineClip(definition)).toBe(definition);
    for (const id of ["../lesson", "web/../lesson", "/web/lesson", "web/lesson.mp4", "web"])
      expect(() => defineClip({ ...definition, id })).toThrow();
    expect(() => defineClip({ ...definition, regions: { slides: "" } })).toThrow();
    expect(() => defineClip({ ...definition, user: " " })).toThrow();
    expect(() => defineClip({ ...definition, seedSql: [1] as unknown as string[] })).toThrow();
  });
  it("builds the shared JSON contract and checks timing and video pixel bounds", () => {
    const marks = { open: [1.2, 5.8] as [number, number] };
    const regions = { slides: [475, 307, 1000, 563] as [number, number, number, number] };
    expect(clipMetadata("web/lesson", "source.ts", 14.2, 30, marks, regions)).toEqual({
      source: "source.ts",
      video: "clips/web/lesson.mp4",
      width: 1600,
      height: 1000,
      fps: 30,
      duration: 14.2,
      marks,
      regions,
    });
    for (const range of [
      [-1, 2],
      [2, 1],
      [1, 20],
      [NaN, 2],
    ])
      expect(() =>
        clipMetadata("web/lesson", "source", 10, 30, { open: range as [number, number] }, {}),
      ).toThrow();
    expect(() => clipMetadata("web/lesson", "source", 10, 24, {}, {})).toThrow();
    expect(() =>
      clipMetadata("web/lesson", "source", 10, 30, {}, { off: [1590, 0, 20, 20] }),
    ).toThrow();
  });
});
describe("mark timing", () => {
  it("records against the recorder clock including unmarked time and forbids duplicate names", async () => {
    let now = 1.2;
    const marks = new ClipMarks(() => now);
    await marks.mark("open", async () => {
      now = 5.8;
    });
    now = 6;
    await marks.mark("next", async () => {
      now = 9.4;
    });
    expect(marks.marks).toEqual({ open: [1.2, 5.8], next: [6, 9.4] });
    await expect(
      marks.mark("open", async () => {
        /* 重複時は実行されない。 */
      }),
    ).rejects.toThrow();
  });
  it("propagates expect failures without recording a successful mark", async () => {
    const loc = { first: () => loc, waitFor: vi.fn().mockRejectedValue(new Error("missing")) };
    const t = new Director(
      { locator: () => loc } as unknown as Page,
      { elapsed: () => 1 } as ScreenRecorder,
    );
    await expect(t.mark("missing", () => t.expect("#missing"))).rejects.toThrow("確認に失敗");
    expect(t.marks).toEqual({});
    await expect(
      t.mark("missing", async () => {
        /* 重複時は実行されない。 */
      }),
    ).rejects.toThrow();
  });
  it("suppresses clip narration/title/caption/keys but keeps actual keyboard input", async () => {
    const narrator = { clip: vi.fn() };
    const page = { evaluate: vi.fn(), waitForTimeout: vi.fn(), keyboard: { press: vi.fn() } };
    const t = new Director(page as unknown as Page, null, {
      clip: true,
      narrator: narrator as never,
    });
    await t.title("badge", "title", "sub");
    await t.caption("caption");
    await t.press("Control+s");
    expect(narrator.clip).not.toHaveBeenCalled();
    expect(page.evaluate).not.toHaveBeenCalled();
    expect(page.keyboard.press).toHaveBeenCalledWith("Control+s");
  });
  it("pretendClick never sends mouse down/up or clicks the target", async () => {
    const page = {
      evaluate: vi.fn(),
      waitForTimeout: vi.fn(),
      mouse: { down: vi.fn(), up: vi.fn() },
    };
    const t = new Director(page as unknown as Page, null);
    vi.spyOn(t, "moveTo").mockResolvedValue();
    await t.pretendClick("#open");
    expect(t.moveTo).toHaveBeenCalledWith("#open");
    expect(page.evaluate).toHaveBeenCalledOnce();
    expect(page.mouse.down).not.toHaveBeenCalled();
    expect(page.mouse.up).not.toHaveBeenCalled();
  });
});

it("rounds duration and mark seconds to two decimal places without changing the input", () => {
  const marks = { open: [4.977999925613403, 8.335000038146973] as [number, number] };
  const metadata = clipMetadata("web/lesson", "source.ts", 12.233333, 30, marks, {});
  expect(metadata.duration).toBe(12.23);
  expect(metadata.marks).toEqual({ open: [4.98, 8.34] });
  expect(marks.open).toEqual([4.977999925613403, 8.335000038146973]);
  expect(() =>
    clipMetadata("web/lesson", "source.ts", 1, 30, { tiny: [0.001, 0.002] }, {}),
  ).toThrow("丸めた mark");
});
