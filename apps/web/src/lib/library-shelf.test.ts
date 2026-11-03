import { describe, expect, it } from "vitest";
import {
  formatClock,
  placeholderHue,
  resumePosition,
  shelfColumns,
  shelfProgress,
  shelfRows,
} from "./library-shelf";
import { apiIsSameOrigin } from "./library-media";

describe("shelf layout", () => {
  it("fits 3 books on a phone and at most 8 on a wide screen", () => {
    expect(shelfColumns(0)).toBe(3);
    expect(shelfColumns(358)).toBe(3);
    expect(shelfColumns(620)).toBe(5);
    expect(shelfColumns(5000)).toBe(8);
  });

  it("splits books into shelf rows", () => {
    expect(shelfRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(shelfRows([], 4)).toEqual([]);
    expect(shelfRows([1], 0)).toEqual([[1]]);
  });

  it("computes reading progress safely", () => {
    expect(shelfProgress({ progress: { completedChapters: 1, totalChapters: 4 } })).toBe(0.25);
    expect(shelfProgress({ progress: { completedChapters: 0, totalChapters: 0 } })).toBe(0);
    expect(shelfProgress({ progress: { completedChapters: 9, totalChapters: 4 } })).toBe(1);
  });

  it("gives the same placeholder colour to the same title", () => {
    expect(placeholderHue("本")).toBe(placeholderHue("本"));
    expect(typeof placeholderHue("")).toBe("number");
  });
});

describe("players", () => {
  it("formats times", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75.9)).toBe("1:15");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });

  it("restarts from the beginning near the end", () => {
    expect(resumePosition(30, 600)).toBe(30);
    expect(resumePosition(597, 600)).toBe(0);
    expect(resumePosition(-1, 600)).toBe(0);
    expect(resumePosition(30, Number.NaN)).toBe(30);
  });
});

describe("media urls", () => {
  it("uses direct URLs only when the API shares the page's origin", () => {
    expect(apiIsSameOrigin("https://stella.example", "https://stella.example")).toBe(true);
    expect(apiIsSameOrigin("http://127.0.0.1:8787", "http://localhost:5173")).toBe(false);
    expect(apiIsSameOrigin("", "http://localhost:5173")).toBe(true);
    expect(apiIsSameOrigin("not a url", "http://localhost:5173")).toBe(false);
  });
});
