import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutBoard, segmentHits, travelPoint, linkPath } from "./scene-layout.js";
import type { Board, VideoStoryboard } from "./video-storyboard.js";
const board = (
  JSON.parse(
    readFileSync(
      new URL(
        "../stages/dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop/video.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as VideoStoryboard
).boards.main;
describe("図解の配置", () => {
  it("試作の全矢印がノードを突き抜けず、直交経路になる", () => {
    const l = layoutBoard(board);
    for (const link of Object.values(l.links))
      for (let i = 1; i < link.points.length; i++) {
        const a = link.points[i - 1],
          b = link.points[i];
        expect(a.x === b.x || a.y === b.y).toBe(true);
        for (const box of Object.values(l.nodes)) expect(segmentHits(a, b, box)).toBe(false);
      }
    for (const box of [...Object.values(l.nodes), ...Object.values(l.zones)]) {
      expect(box.y).toBeGreaterThanOrEqual(170);
      expect(box.y + box.h).toBeLessThanOrEqual(930);
    }
  });
  it("4列2行・6ノード6リンクの経路が見出しを避け、線分と矢じりの接続口を共有しない", () => {
    expect([board.cols, board.rows, board.nodes.length, board.links?.length]).toEqual([4, 2, 6, 6]);
    const l = layoutBoard(board);
    const segments = (points: { x: number; y: number }[]) =>
      points.slice(1).map((b, i) => ({ a: points[i], b }));
    for (const spec of board.links ?? []) {
      for (const { a, b } of segments(l.links[spec.id].points)) {
        for (const [id, box] of Object.entries(l.nodes))
          if (id !== spec.from && id !== spec.to)
            expect(segmentHits(a, b, box), `${spec.id}: ${id}`).toBe(false);
        for (const box of Object.values(l.zones))
          expect(
            segmentHits(a, b, { x: box.x + 10, y: box.y + 6, w: Math.min(box.w - 20, 480), h: 54 }),
            spec.id,
          ).toBe(false);
        for (const other of board.links ?? []) {
          if (other.id === spec.id) continue;
          for (const { a: c, b: d } of segments(l.links[other.id].points)) {
            if (a.x === b.x && c.x === d.x && a.x === c.x)
              expect(
                Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
                  Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)),
              ).toBeLessThanOrEqual(0);
            if (a.y === b.y && c.y === d.y && a.y === c.y)
              expect(
                Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
                  Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)),
              ).toBeLessThanOrEqual(0);
          }
        }
      }
    }
    const write = l.nodes.write;
    expect(l.links["result-write"].points).toEqual([
      { x: l.nodes.result.x, y: l.nodes.result.y + l.nodes.result.h / 2 },
      { x: write.x + write.w / 2, y: l.nodes.result.y + l.nodes.result.h / 2 },
      { x: write.x + write.w / 2, y: write.y + write.h },
    ]);
    expect(l.links["quiz-write"].points.length).toBeLessThanOrEqual(4);
    for (const link of Object.values(l.links))
      for (const { a, b } of segments(link.points)) expect(a).not.toEqual(b);
  });
  for (const route of ["under", "over"] as const)
    it(`${route}は上下の通路を経由する`, () => {
      const b: Board = {
        cols: 3,
        rows: 1,
        nodes: [
          { id: "a", label: "始点", icon: "file", at: [1, 1] },
          { id: "b", label: "壁", icon: "file", at: [2, 1] },
          { id: "c", label: "終点", icon: "file", at: [3, 1] },
        ],
        links: [{ id: "ac", from: "a", to: "c", route }],
      };
      const l = layoutBoard(b),
        path = l.links.ac.points;
      expect(
        path.some((p) => (route === "under" ? p.y > l.nodes.b.y + l.nodes.b.h : p.y < l.nodes.b.y)),
      ).toBe(true);
      for (let i = 1; i < path.length; i++)
        expect(segmentHits(path[i - 1], path[i], l.nodes.b)).toBe(false);
      expect(linkPath(l.links.ac)).toMatch(/^M/);
    });
  it("travelはリンクの距離の比で補間する", () => {
    const paths = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 10, y: 0 },
        { x: 10, y: 30 },
      ],
    ];
    expect(travelPoint(paths, 0.5)).toEqual({ x: 10, y: 10 });
    expect(travelPoint(paths, 1)).toEqual({ x: 10, y: 30 });
  });
});
