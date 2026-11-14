import type { Board } from "./video-storyboard.js";
export interface Point {
  x: number;
  y: number;
}
export interface Box extends Point {
  w: number;
  h: number;
}
export interface LinkLayout {
  points: Point[];
  label: Point;
}
export interface BoardLayout {
  nodes: Record<string, Box>;
  zones: Record<string, Box>;
  links: Record<string, LinkLayout>;
}
const pad = (b: Box, p: number): Box => ({
  x: b.x - p,
  y: b.y - p,
  w: b.w + 2 * p,
  h: b.h + 2 * p,
});
export function segmentHits(a: Point, b: Point, r: Box): boolean {
  return a.x === b.x
    ? a.x > r.x && a.x < r.x + r.w && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.h
    : a.y > r.y && a.y < r.y + r.h && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.w;
}
/** 直交可視グラフでカードと囲みの見出しを避ける。route は経由する水平の通路を指定する。 */
function route(a: Point, b: Point, obstacles: Box[], via?: number): Point[] {
  if (via !== undefined) {
    // 上下の指定は経由点を通す。経由点はカードの外側の縦通路に置く。
    const mid = { x: a.x, y: via };
    if (
      !obstacles.some((r) => mid.x > r.x && mid.x < r.x + r.w && mid.y > r.y && mid.y < r.y + r.h)
    )
      return [...route(a, mid, obstacles), ...route(mid, b, obstacles).slice(1)];
  }
  const xs = [...new Set([a.x, b.x, 50, 1870, ...obstacles.flatMap((r) => [r.x, r.x + r.w])])].sort(
    (a, b) => a - b,
  );
  const ys = [...new Set([a.y, b.y, 190, 920, ...obstacles.flatMap((r) => [r.y, r.y + r.h])])].sort(
    (a, b) => a - b,
  );
  const width = xs.length,
    key = (x: number, y: number) => y * width + x;
  const start = key(xs.indexOf(a.x), ys.indexOf(a.y)),
    end = key(xs.indexOf(b.x), ys.indexOf(b.y));
  const distances = new Map<number, number>([[start, 0]]),
    previous = new Map<number, number>();
  const open = new Set([start]);
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const id of open) {
      const cost = distances.get(id) ?? Infinity;
      const h = Math.abs(xs[id % width] - b.x) + Math.abs(ys[Math.floor(id / width)] - b.y);
      if (cost + h < best) {
        best = cost + h;
        current = id;
      }
    }
    if (current === end) break;
    open.delete(current);
    const x = current % width,
      y = Math.floor(current / width),
      from = { x: xs[x], y: ys[y] };
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= ys.length) continue;
      const to = { x: xs[nx], y: ys[ny] };
      if (obstacles.some((r) => segmentHits(from, to, r))) continue;
      const id = key(nx, ny),
        cost =
          (distances.get(current) ?? 0) + Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + 0.01;
      if (cost < (distances.get(id) ?? Infinity)) {
        distances.set(id, cost);
        previous.set(id, current);
        open.add(id);
      }
    }
  }
  if (!distances.has(end)) throw new Error("矢印をカードの外側に配置できません");
  const path: Point[] = [];
  let id: number | undefined = end;
  while (id !== undefined) {
    path.unshift({ x: xs[id % width], y: ys[Math.floor(id / width)] });
    id = previous.get(id);
  }
  return path.filter(
    (p, i) =>
      i === 0 ||
      i === path.length - 1 ||
      !(
        (path[i - 1].x === p.x && path[i + 1].x === p.x) ||
        (path[i - 1].y === p.y && path[i + 1].y === p.y)
      ),
  );
}
function simplify(path: Point[]): Point[] {
  const distinct = path.filter((p, i) => !i || p.x !== path[i - 1].x || p.y !== path[i - 1].y);
  return distinct.filter(
    (p, i) =>
      !i ||
      i === distinct.length - 1 ||
      !(
        (distinct[i - 1].x === p.x && distinct[i + 1].x === p.x) ||
        (distinct[i - 1].y === p.y && distinct[i + 1].y === p.y)
      ),
  );
}
function overlaps(a: Point, b: Point, c: Point, d: Point): boolean {
  return a.x === b.x && c.x === d.x && a.x === c.x
    ? Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <
        Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
    : a.y === b.y &&
        c.y === d.y &&
        a.y === c.y &&
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <
          Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x));
}
export function layoutBoard(board: Board): BoardLayout {
  const cw = 1740 / board.cols,
    ch = 700 / board.rows;
  const nodes = Object.fromEntries(
    board.nodes.map((n) => {
      const w = Math.min(360, cw - 80),
        h = Math.min(210, ch - 70);
      return [
        n.id,
        { x: 90 + (n.at[0] - 0.5) * cw - w / 2, y: 210 + (n.at[1] - 0.5) * ch + 24 - h / 2, w, h },
      ];
    }),
  );
  const zones = Object.fromEntries(
    (board.zones ?? []).map((z) => [
      z.id,
      {
        x: 90 + (z.cells[0] - 1) * cw + 6,
        y: 210 + (z.cells[1] - 1) * ch,
        w: z.cells[2] * cw - 12,
        h: z.cells[3] * ch - 12,
      },
    ]),
  );
  const obstacles = [
    ...Object.values(nodes).map((b) => pad(b, 14)),
    ...Object.values(zones).map((b) => ({
      x: b.x + 10,
      y: b.y + 6,
      w: Math.min(b.w - 20, 480),
      h: 54,
    })),
  ];
  const links: Record<string, LinkLayout> = {};
  const ports = (b: Box) => [
    { x: b.x - 14, y: b.y + b.h / 2 },
    { x: b.x + b.w + 14, y: b.y + b.h / 2 },
    { x: b.x + b.w / 2, y: b.y - 14 },
    { x: b.x + b.w / 2, y: b.y + b.h + 14 },
  ];
  const edge = (p: Point, b: Box): Point => ({
    x: Math.max(b.x, Math.min(b.x + b.w, p.x)),
    y: Math.max(b.y, Math.min(b.y + b.h, p.y)),
  });
  // 長い戻り線の通路を先に確保する。同じ行の短い矢印は直線のまま。
  const ordered = [...(board.links ?? [])].sort((u, v) => {
    const span = (l: typeof u) =>
      Math.abs(nodes[l.from].x - nodes[l.to].x) + Math.abs(nodes[l.from].y - nodes[l.to].y);
    return span(v) - span(u);
  });
  for (const link of ordered) {
    const a = nodes[link.from],
      b = nodes[link.to];
    let best: Point[] = [];
    let cost = Infinity;
    const via =
      link.route === "under"
        ? Math.max(a.y + a.h, b.y + b.h) + 32
        : link.route === "over"
          ? Math.min(a.y, b.y) - 32
          : undefined;
    for (const from of ports(a))
      for (const to of ports(b)) {
        try {
          const start = edge(from, a),
            end = edge(to, b);
          const candidates =
            via === undefined
              ? [
                  [start, { x: end.x, y: start.y }, end],
                  [start, { x: start.x, y: end.y }, end],
                  [
                    start,
                    { x: (from.x + to.x) / 2, y: start.y },
                    { x: (from.x + to.x) / 2, y: end.y },
                    end,
                  ],
                  [
                    start,
                    { x: start.x, y: (from.y + to.y) / 2 },
                    { x: end.x, y: (from.y + to.y) / 2 },
                    end,
                  ],
                ]
              : [];
          const clear = (path: Point[]) =>
            path
              .slice(1)
              .every(
                (p, i) =>
                  !obstacles.some(
                    (r) =>
                      r !== obstacles[board.nodes.findIndex((n) => n.id === link.from)] &&
                      r !== obstacles[board.nodes.findIndex((n) => n.id === link.to)] &&
                      segmentHits(path[i], p, r),
                  ) &&
                  !Object.values(links).some((l) =>
                    l.points.slice(1).some((q, j) => overlaps(path[i], p, l.points[j], q)),
                  ),
              ) &&
            path
              .slice(1)
              .every((p, i) => !segmentHits(path[i], p, a) && !segmentHits(path[i], p, b));
          const simple = candidates.map(simplify).find(
            (path) =>
              path.length >= 2 &&
              clear(path) &&
              // 接続口からカードの外向きに出入りする。
              (path[1].x - start.x) * (from.x - start.x) +
                (path[1].y - start.y) * (from.y - start.y) >
                0 &&
              (path[path.length - 2].x - end.x) * (to.x - end.x) +
                (path[path.length - 2].y - end.y) * (to.y - end.y) >
                0,
          );
          const path = simple ?? simplify([start, ...route(from, to, obstacles, via), end]);
          if (!clear(path)) continue;
          const length =
            path
              .slice(1)
              .reduce((n, p, i) => n + Math.abs(p.x - path[i].x) + Math.abs(p.y - path[i].y), 0) +
            path.length * 80 +
            // 行も列も違うときは、横から出て上下の中央へ入るかぎ形を優先。
            (a.x !== b.x && a.y !== b.y && !(start.y === a.y + a.h / 2 && end.x === b.x + b.w / 2)
              ? 200
              : 0);
          if (length < cost) {
            best = path;
            cost = length;
          }
        } catch {
          /* 他の接続口を試す。 */
        }
      }
    if (!best.length) throw new Error(`矢印「${link.id}」の経路を配置できません`);
    // 最長の通路に白い下地付きラベルを置く。カードを避けた経路なので文字がカードに乗らない。
    const segments = best
      .slice(1)
      .map((p, i) => ({
        a: best[i],
        b: p,
        length: Math.abs(p.x - best[i].x) + Math.abs(p.y - best[i].y),
      }))
      .sort((a, b) => b.length - a.length);
    const seg = segments[0];
    links[link.id] = {
      points: best,
      label: { x: (seg.a.x + seg.b.x) / 2, y: (seg.a.y + seg.b.y) / 2 },
    };
  }
  return { nodes, zones, links };
}
export function linkPath(link: LinkLayout): string {
  return link.points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
}
/** along の距離で補間する（リンクごとの長さが異なっても速さを一定にする）。 */
export function travelPoint(paths: Point[][], progress: number): Point {
  const segments = paths.flatMap((path) =>
    path
      .slice(1)
      .map((b, i) => ({ a: path[i], b, length: Math.hypot(b.x - path[i].x, b.y - path[i].y) })),
  );
  let remaining = Math.max(0, Math.min(1, progress)) * segments.reduce((s, p) => s + p.length, 0);
  for (const s of segments) {
    if (remaining <= s.length) {
      const t = s.length ? remaining / s.length : 0;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
    }
    remaining -= s.length;
  }
  return segments.at(-1)?.b ?? { x: 0, y: 0 };
}
