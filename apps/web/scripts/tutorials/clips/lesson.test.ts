import { expect, it, vi } from "vitest";
import type { Director } from "../lib/director";
vi.mock("../lib/scenario-navigation", () => ({ openEntryStage: vi.fn() }));
import lesson from "./lesson";

it.each([1, 2, 3])(
  "保存位置が%dページ目でも next-slide は1ページ目から収録する",
  async (initial) => {
    let page = initial;
    const marks: [string, number, number][] = [];
    const previous = {};
    const t = {
      page: {
        locator: () => ({ count: async () => Number(page === 1) }),
        getByRole: () => previous,
      },
      click: async (target: unknown) => {
        if (target === previous) page--;
        if (target === "[data-testid=lesson-next-slide]") page++;
      },
      expect: async (selector: string) => {
        const wanted = /data-page='(\d+)'/.exec(selector);
        if (wanted) expect(page).toBe(Number(wanted[1]));
      },
      wait: async () => undefined,
      mark: async (id: string, fn: () => Promise<void>) => {
        const start = page;
        await fn();
        marks.push([id, start, page]);
      },
    } as unknown as Director;
    await lesson.run(t);
    expect(marks).toEqual([
      ["open-lesson", initial, initial],
      ["next-slide", 1, 2],
    ]);
  },
);
