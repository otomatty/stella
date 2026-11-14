/** 時刻から全属性を再計算する場面。時計・CSS transition・外部通信を使わない。 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  layoutBoard,
  linkPath,
  travelPoint,
  type BoardLayout,
  type Box,
} from "../../src/scene-layout.js";
import type { SceneTimeline } from "../../src/scene-timeline.js";
import {
  VIDEO_ICONS,
  type Board,
  type IconName,
  type Scene,
  type SceneState,
} from "../../src/video-storyboard.js";

const require = createRequire(import.meta.url);
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const iconLicense = readFileSync(
  join(dirname(require.resolve("lucide-static/package.json")), "LICENSE"),
  "utf8",
);
const fontFile = require.resolve("@fontsource/noto-sans-jp/500.css");
export const sceneFontCss = readFileSync(fontFile, "utf8").replace(
  /url\(\.\/(.+?)\)/g,
  (_, p: string) => `url(${pathToFileURL(join(dirname(fontFile), p)).href})`,
);
export interface SceneHtmlInput {
  board: Board;
  scene: Scene;
  state: SceneState;
  timing: SceneTimeline;
  index: number;
  total: number;
  previous?: Scene;
}
interface RenderData extends SceneHtmlInput {
  layout: BoardLayout;
}
export interface ScenePageWindow extends Window {
  __setTime: (seconds: number) => void;
  __busyRanges: [number, number][];
  __overflows: () => string[];
}
function runtime(data: RenderData, interpolate: typeof travelPoint) {
  const win = window as unknown as ScenePageWindow;
  const { board, scene, state, timing, layout } = data;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
  const smooth = (n: number) => {
    const t = clamp(n);
    return t * t * (3 - 2 * t);
  };
  const ids = [...(board.zones ?? []), ...board.nodes, ...(board.links ?? [])].map((e) => e.id);
  const elements = new Map(
    ids.map((id) => [id, document.getElementById(`element-${id}`) as unknown as SVGGElement]),
  );
  const camera = (zoom: string[] | "all"): Box => {
    const all = { x: 0, y: 170, w: 1920, h: 760 };
    if (zoom === "all") return all;
    const boxes = zoom.flatMap(
      (id) =>
        layout.nodes[id] ??
        layout.zones[id] ??
        (layout.links[id] ? layout.links[id].points.map((p) => ({ ...p, w: 0, h: 0 })) : []),
    );
    if (!boxes.length) return all;
    const x = Math.min(...boxes.map((b) => b.x)) - 32,
      y = Math.min(...boxes.map((b) => b.y)) - 32;
    const w = Math.max(...boxes.map((b) => b.x + b.w)) + 32 - x,
      h = Math.max(...boxes.map((b) => b.y + b.h)) + 32 - y;
    const scale = Math.max(1, Math.min(1.65, 1920 / w, 760 / h)),
      nw = 1920 / scale,
      nh = 760 / scale;
    return {
      x: Math.max(0, Math.min(1920 - nw, x + w / 2 - nw / 2)),
      y: Math.max(170, Math.min(930 - nh, y + h / 2 - nh / 2)),
      w: nw,
      h: nh,
    };
  };
  const initial = camera(state.start.zoom);
  const zoneNodes = new Map(
    (board.zones ?? []).map((z) => [
      z.id,
      board.nodes
        .filter(
          (n) =>
            n.at[0] >= z.cells[0] &&
            n.at[0] < z.cells[0] + z.cells[2] &&
            n.at[1] >= z.cells[1] &&
            n.at[1] < z.cells[1] + z.cells[3],
        )
        .map((n) => n.id),
    ]),
  );
  const showSeconds = 0.5,
    zoneNodeDelay = 0.3;
  // 空の囲みが縮み始めたあとで、その囲みの中身を出す。
  const delayedShows = state.beats.map((bs) => {
    const delayed = new Set<string>();
    for (const inside of zoneNodes.values()) {
      if (
        inside.some((id) => bs.before.visible.includes(id)) ||
        !inside.some((id) => bs.after.visible.includes(id))
      )
        continue;
      const members = [
        ...inside,
        ...(board.links ?? [])
          .filter((link) => inside.includes(link.from) && inside.includes(link.to))
          .map((link) => link.id),
      ];
      for (const id of members)
        if (!bs.before.visible.includes(id) && bs.after.visible.includes(id)) delayed.add(id);
    }
    return delayed;
  });
  win.__busyRanges = [
    [0, 0.4],
    ...timing.beats.map((t, i): [number, number] => [
      t.start,
      Math.max(
        t.start + 0.8,
        t.start + (delayedShows[i].size ? zoneNodeDelay : 0) + showSeconds,
        scene.beats[i].travel ? t.end : t.start,
      ),
    ]),
    ...timing.beats
      .filter((_, i) => scene.beats[i].focus?.length)
      .map((t) => [t.end, t.end + 0.2] as [number, number]),
  ];
  win.__setTime = (time: number) => {
    let k = -1;
    for (let i = 0; i < timing.beats.length; i++) if (timing.beats[i].start <= time) k = i;
    const beat = k >= 0 ? scene.beats[k] : undefined,
      bt = k >= 0 ? timing.beats[k] : undefined,
      bs = k >= 0 ? state.beats[k] : undefined;
    const elapsed = bt ? time - bt.start : 0;
    const current = bs?.after ?? state.start;
    for (const id of ids) {
      const el = elements.get(id);
      if (!el) continue;
      const showElapsed = elapsed - (delayedShows[k]?.has(id) ? zoneNodeDelay : 0);
      let opacity = current.visible.includes(id) ? 1 : 0;
      if (bs) {
        const was = bs.before.visible.includes(id),
          now = bs.after.visible.includes(id);
        if (was !== now) opacity = now ? ease(showElapsed / showSeconds) : 1 - ease(elapsed / 0.3);
      }
      const activeFocus = !!(bs?.focus.length && bt && time < bt.end + 0.2);
      const fade =
        activeFocus && bs && !bs.focus.includes(id)
          ? 1 - 0.7 * Math.min(ease(elapsed / 0.2), 1 - smooth((time - (bt?.end ?? 0)) / 0.2))
          : 1;
      el.setAttribute("opacity", String(opacity * fade));
      const pulse =
        beat?.pulse?.includes(id) && elapsed < 0.6 ? Math.sin(clamp(elapsed / 0.6) * Math.PI) : 0;
      const box = layout.nodes[id] ?? layout.zones[id];
      if (box) {
        const cx = box.x + box.w / 2,
          cy = box.y + box.h / 2;
        const s = 1 + pulse * 0.045;
        el.setAttribute("transform", `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
      }
      const inside = zoneNodes.get(id);
      if (inside && box) {
        const occupied = (visible: string[]) => inside.some((n) => visible.includes(n));
        let compact = occupied(state.start.visible) ? 1 : 0;
        for (let i = 0; i <= k; i++) {
          const before = occupied(state.beats[i].before.visible),
            after = occupied(state.beats[i].after.visible);
          if (before !== after)
            compact =
              (before ? 1 : 0) + (after ? 1 : -1) * smooth((time - timing.beats[i].start) / 0.5);
        }
        const mix = (large: number, small: number) => large + (small - large) * compact;
        const iconSize = mix(160, 36),
          labelSize = mix(64, 36);
        const zone = board.zones?.find((z) => z.id === id);
        const icon = document.getElementById(`zone-icon-${id}`);
        icon?.setAttribute("x", String(mix(box.x + (box.w - 160) / 2, box.x + 18)));
        icon?.setAttribute("y", String(mix(box.y + box.h / 2 - 130, box.y + 14)));
        icon?.setAttribute("width", String(iconSize));
        icon?.setAttribute("height", String(iconSize));
        const label = document.getElementById(
          `zone-label-${id}`,
        ) as unknown as SVGTextElement | null;
        const x = mix(box.x + box.w / 2, box.x + (zone?.icon ? 68 : 20));
        label?.setAttribute("font-size", String(labelSize));
        label?.setAttribute("text-anchor", "middle");
        // 実際の文字幅で左上のラベルの左端を合わせる。
        const anchorX = x + ((label?.getComputedTextLength?.() ?? 0) / 2) * compact;
        label?.setAttribute("x", String(anchorX));
        label?.setAttribute("y", String(mix(box.y + box.h / 2 + 110, box.y + 44)));
      }
      const ring = el.querySelector(".ring");
      const focusStrength =
        activeFocus && beat?.focus?.includes(id)
          ? Math.min(ease(elapsed / 0.2), 1 - smooth((time - (bt?.end ?? 0)) / 0.2))
          : 0;
      ring?.setAttribute("opacity", String(Math.max(pulse, focusStrength)));
      const tone = board.zones?.find((z) => z.id === id)?.tone;
      if (ring && tone) {
        const ownColor = focusStrength > 0;
        const color = tone === "blue" ? "#2563EB" : "#8330C7";
        ring.setAttribute("stroke", ownColor ? color : "#E62F9A");
        ring.setAttribute("stroke-opacity", "1");
        ring.setAttribute("stroke-width", ownColor ? "4" : "3");
        ring.setAttribute("fill", ownColor ? color : "rgba(230,47,154,0.08)");
        ring.setAttribute("fill-opacity", ownColor ? "0.10" : "1");
      }
      const link = el.querySelector<SVGPathElement>(".link");
      if (link) {
        const highlighted = pulse > 0 || focusStrength > 0;
        link.setAttribute("stroke", highlighted ? "#E62F9A" : "#5C5C66");
        link.setAttribute("stroke-width", String(3 + pulse * 3));
        const length = link.getTotalLength(),
          show = !!(bs && !bs.before.visible.includes(id) && bs.after.visible.includes(id));
        link.setAttribute("stroke-dasharray", String(length));
        link.setAttribute(
          "stroke-dashoffset",
          String(show ? length * (1 - ease(showElapsed / showSeconds)) : 0),
        );
        link.setAttribute(
          "marker-end",
          show && showElapsed < 0.45 ? "" : highlighted ? "url(#arrow-accent)" : "url(#arrow)",
        );
      }
      const mark = el.querySelector<SVGGElement>(".mark");
      if (mark) {
        const kind = current.marks[id];
        mark.setAttribute("opacity", kind ? "1" : "0");
        const newly = kind && bs && bs.before.marks[id] !== kind;
        const s = newly
          ? ease(elapsed / 0.35) * (1 + 0.12 * Math.sin(clamp(elapsed / 0.35) * Math.PI))
          : 1;
        const x = (box?.x ?? 0) + (box?.w ?? 0) - 4,
          y = (box?.y ?? 0) + 10;
        mark.setAttribute("transform", `translate(${x} ${y}) scale(${s})`);
        for (const item of mark.querySelectorAll<SVGGElement>("[data-kind]"))
          item.setAttribute("display", item.dataset.kind === kind ? "inline" : "none");
      }
    }
    let cam = initial;
    for (let i = 0; i <= k; i++)
      if (scene.beats[i].zoom !== undefined) {
        const target = camera(state.beats[i].after.zoom),
          t = smooth((time - timing.beats[i].start) / 0.8);
        cam = {
          x: cam.x + (target.x - cam.x) * t,
          y: cam.y + (target.y - cam.y) * t,
          w: cam.w + (target.w - cam.w) * t,
          h: cam.h + (target.h - cam.h) * t,
        };
      }
    document
      .getElementById("diagram")
      ?.setAttribute("viewBox", `${cam.x} ${cam.y} ${cam.w} ${cam.h}`);
    const travel = document.getElementById("traveler");
    if (travel) {
      const show = !!(beat?.travel && bt && time >= bt.start && time < bt.end);
      travel.setAttribute("opacity", show ? "1" : "0");
      if (!show) travel.setAttribute("transform", "translate(0 0)");
      if (show && beat?.travel && bt) {
        const p = interpolate(
          beat.travel.along.map((id) => layout.links[id].points),
          (time - bt.start) / (bt.end - bt.start),
        );
        travel.setAttribute("transform", `translate(${p.x} ${p.y})`);
      }
      for (const el of travel.querySelectorAll<SVGElement>("[data-icon]"))
        el.setAttribute(
          "display",
          el.dataset.icon === (beat?.travel?.icon ?? "file") ? "inline" : "none",
        );
    }
    const title = document.getElementById("heading"),
      prev = document.getElementById("previous-heading");
    if (title) title.style.opacity = String(ease(time / 0.4));
    if (prev) prev.style.opacity = String(1 - ease(time / 0.4));
    const white = document.getElementById("white");
    if (white) white.style.opacity = String(data.index === 0 ? 1 - ease(time / 0.4) : 0);
  };
  win.__overflows = () =>
    [...document.querySelectorAll<SVGTextElement>("[data-fit]")].flatMap((el) => {
      const b = el.getBBox(),
        limit = JSON.parse(el.dataset.fit ?? "{}") as Box;
      return b.x < limit.x - 1 ||
        b.y < limit.y - 1 ||
        b.x + b.width > limit.x + limit.w + 1 ||
        b.y + b.height > limit.y + limit.h + 1
        ? [el.textContent ?? ""]
        : [];
    });
  win.__setTime(0);
}
function iconSvg(name: IconName, x: number, y: number, size: number): string {
  const file = require.resolve(`lucide-static/icons/${VIDEO_ICONS[name]}.svg`);
  const body = readFileSync(file, "utf8")
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
function label(text: string, b: Box, size = 36, align: "middle" | "start" = "middle"): string {
  const chars = Array.from(text),
    per = Math.max(1, Math.floor((b.w - 16) / size));
  const lines = Array.from({ length: Math.ceil(chars.length / per) }, (_, i) =>
    chars.slice(i * per, (i + 1) * per).join(""),
  );
  const x = align === "middle" ? b.x + b.w / 2 : b.x + 8;
  return `<text data-fit='${JSON.stringify(b)}' x="${x}" y="${b.y + (b.h - lines.length * size * 1.2) / 2 + size}" font-size="${size}" text-anchor="${align}">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? size * 1.2 : 0}">${escapeHtml(l)}</tspan>`).join("")}</text>`;
}
function mark(): string {
  const symbols = {
    check: '<path d="M-12 0L-3 10L14 -10"/>',
    cross: '<path d="M-11 -11L11 11M11 -11L-11 11"/>',
    question:
      '<path d="M-8 -8C-8 -20 16 -20 10 -3C8 1 0 1 0 7"/><circle cy="16" r="2" fill="white" stroke="none"/>',
    redo: '<path d="M13 -7A15 15 0 1 0 14 8M13 -18V-7H2"/>',
  };
  return `<g class="mark">${(["check", "cross", "question", "redo"] as const).map((kind, i) => `<g data-kind="${kind}"><circle r="28" fill="${["#16A34A", "#E5342B", "#5C5C66", "#E62F9A"][i]}" stroke="white" stroke-width="3"/><g fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${symbols[kind]}</g></g>`).join("")}</g>`;
}
export function sceneHtml(input: SceneHtmlInput): string {
  const toneColor = (tone?: "blue" | "violet") =>
    tone === "blue" ? "#2563EB" : tone === "violet" ? "#8330C7" : undefined;
  const layout = layoutBoard(input.board);
  const zones = (input.board.zones ?? [])
    .map((z) => {
      const b = layout.zones[z.id],
        color = toneColor(z.tone);
      return `<g id="element-${escapeHtml(z.id)}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="20" fill="${color ?? "none"}" fill-opacity="0.05" stroke="${color ?? "#DDDDE2"}" stroke-opacity="${color ? 0.45 : 1}" stroke-width="3"/><rect class="ring" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="20" fill="rgba(230,47,154,0.08)" stroke="#E62F9A" stroke-width="3"/><g style="color:${color ?? "#0E0E10"}">${z.icon ? iconSvg(z.icon, b.x + 18, b.y + 14, 36).replace("<svg ", `<svg id="zone-icon-${escapeHtml(z.id)}" `) : ""}<text id="zone-label-${escapeHtml(z.id)}" style="fill:currentColor" font-size="36">${escapeHtml(z.label)}</text></g>${mark()}</g>`;
    })
    .join("");
  const nodes = input.board.nodes
    .map((n) => {
      const b = layout.nodes[n.id],
        size = b.h < 160 ? 40 : 76;
      const zone = input.board.zones?.find(
        (z) =>
          n.at[0] >= z.cells[0] &&
          n.at[0] < z.cells[0] + z.cells[2] &&
          n.at[1] >= z.cells[1] &&
          n.at[1] < z.cells[1] + z.cells[3],
      );
      return `<g id="element-${escapeHtml(n.id)}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="16" fill="white" stroke="#DDDDE2" stroke-width="2.5" filter="url(#shadow)"/><rect class="ring" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="16" fill="rgba(230,47,154,0.08)" stroke="#E62F9A" stroke-width="3"/><g style="color:${toneColor(zone?.tone) ?? "#0E0E10"}">${iconSvg(n.icon, b.x + (b.w - size) / 2, b.y + 14, size)}</g>${label(n.label, { x: b.x + 6, y: b.y + size + 16, w: b.w - 12, h: b.h - size - 20 })}${mark()}</g>`;
    })
    .join("");
  const links = (input.board.links ?? [])
    .map((l) => {
      const p = layout.links[l.id];
      return `<g id="element-${escapeHtml(l.id)}"><path class="link" d="${linkPath(p)}" fill="none" stroke="#5C5C66" stroke-width="3" stroke-linejoin="round" marker-end="url(#arrow)"/>${l.label ? `<rect x="${p.label.x - Array.from(l.label).length * 20 - 10}" y="${p.label.y - 28}" width="${Array.from(l.label).length * 40 + 20}" height="56" rx="8" fill="#F7F7F9"/>${label(l.label, { x: p.label.x - 140, y: p.label.y - 28, w: 280, h: 56 })}` : ""}</g>`;
    })
    .join("");
  const heading = (s: Scene | undefined) =>
    s
      ? `<span>${s.role === "point" ? `要点 ${s.point}` : s.role === "recap" ? "まとめ" : ""}</span> ${escapeHtml(s.title)}`
      : "";
  const { previous: _previous, ...renderInput } = input;
  const data = JSON.stringify({ ...renderInput, layout }).replace(/</g, "\\u003c");
  return `<!doctype html><!-- ${iconLicense} --><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#F7F7F9;color:#0E0E10;font-family:'Noto Sans JP',sans-serif;font-weight:500}header{height:130px;background:white;border-bottom:2px solid #DDDDE2;display:flex;align-items:center;padding:0 72px;font-size:48px}header span{font-size:30px;color:#5C5C66;margin-right:24px}#heading,#previous-heading{position:absolute;left:72px;top:30px;height:72px;white-space:nowrap}.dots{margin-left:auto;display:flex;gap:18px}.dot{width:16px;height:16px;border-radius:50%;background:#DDDDE2}.dot.active{background:#E62F9A}svg text{fill:#0E0E10}#diagram{position:absolute;left:0;top:170px;width:1920px;height:760px;overflow:hidden}#white{position:absolute;inset:0;background:white;pointer-events:none}
  </style><header><div id="previous-heading">${heading(input.previous)}</div><div id="heading">${heading(input.scene)}</div><div class="dots">${Array.from({ length: input.total }, (_, i) => `<i class="dot ${i === input.index ? "active" : ""}"></i>`).join("")}</div></header><svg id="diagram" viewBox="0 170 1920 760"><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.05"/></filter>${["arrow", "arrow-accent"].map((id, i) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9Z" fill="${i ? "#E62F9A" : "#5C5C66"}"/></marker>`).join("")}</defs>${zones}${links}${nodes}<g id="traveler" style="color:white"><circle r="27" fill="#E62F9A"/>${Object.keys(
    VIDEO_ICONS,
  )
    .map((name) => `<g data-icon="${name}">${iconSvg(name as IconName, -18, -18, 36)}</g>`)
    .join(
      "",
    )}</g></svg><div id="white"></div><script>const travelPoint=${travelPoint.toString()};(${runtime.toString()})(${data}, travelPoint);</script></html>`;
}
