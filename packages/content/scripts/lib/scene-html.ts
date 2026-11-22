import {
  codeColorsCss,
  codeFontCss,
  codeHtml,
  codeTextWidth,
  highlightCode,
} from "./scene-code-html.js";
import type { CodeSceneState } from "../../src/scene-code.js";
import { viewHtml } from "./scene-view-html.js";
import type { ViewImage } from "../../src/scene-view.js";
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
import type { SceneTimeline, TextScene } from "../../src/scene-timeline.js";
import {
  VIDEO_ICONS,
  type Board,
  type BoardState,
  type IconName,
  type MarkKind,
  type Scene,
  type BoardScene,
  type ViewSceneState,
  type SceneState,
  type VideoStoryboard,
} from "../../src/video-storyboard.js";

const require = createRequire(import.meta.url);
export const escapeHtml = (s: string) =>
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
  schema?: VideoStoryboard["schema"];
  images?: Record<string, ViewImage>;
  previousView?: ViewSceneState;
  /** code の前後だけ、直前の場面の最終コマを重ねてクロスフェードする。 */
  previousFrame?: string;
  scene: Scene;
  state: SceneState | ViewSceneState | CodeSceneState;
  timing: SceneTimeline;
  index: number;
  total: number;
  fadeFromBackground?: boolean;
}
interface BoardHtmlInput extends Omit<SceneHtmlInput, "scene" | "state"> {
  scene: BoardScene;
  state: SceneState;
}
interface RenderData extends BoardHtmlInput {
  layout: BoardLayout;
}
export interface ScenePageWindow extends Window {
  __setTime: (seconds: number) => Promise<void>;
  __busyRanges: [number, number][];
  __overflows: () => string[];
}
function textRuntime(scene: TextScene) {
  const win = window as unknown as ScenePageWindow;
  const content = document.getElementById("text-scene") as HTMLElement;
  const white = document.getElementById("white") as HTMLElement;
  const fadeOut = 0.4;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  win.__busyRanges = [
    [0, 0.4],
    [scene.duration - fadeOut, scene.duration],
  ];
  win.__setTime = async (time) => {
    content.style.opacity = String(clamp(Math.min(time / 0.4, (scene.duration - time) / fadeOut)));
    white.style.opacity = String(clamp(1 - time / 0.4));
  };
  win.__overflows = () => {
    return content.scrollHeight > 900 ? ["タイトルが画面に収まりません"] : [];
  };
  win.__setTime(0);
}
/** タイトルは中央の文を読むため、音声があっても字幕を重ねない。 */
export function textSceneHtml(scene: TextScene): string {
  const data = JSON.stringify(scene).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#FFFFFF;color:#0E0E10;font-family:'Noto Sans JP',sans-serif;font-weight:500}
  body{display:flex;align-items:center;justify-content:center}#text-scene{width:1680px;text-align:center;overflow-wrap:anywhere;opacity:0}#text-scene header{font-size:32px;color:#5C5C66;margin-bottom:24px}#text-scene h1{font-size:80px;font-weight:700;line-height:1.4;margin:0}#accent{width:96px;height:6px;background:#E62F9A;margin:40px auto 0}#white{position:absolute;inset:0;background:white;pointer-events:none}
  </style><main id="text-scene">${scene.header ? `<header>${escapeHtml(scene.header)}</header>` : ""}<h1>${escapeHtml(scene.title)}</h1><div id="accent"></div></main><div id="white"></div><script>(${textRuntime.toString()})(${data});</script></html>`;
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
    // 図の座標はそのまま使い、SVG の表示位置を上へ移す。
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
        scene.beats[i].travel ? t.end + 1 / 30 : t.start,
      ),
    ]),
    ...timing.beats
      .filter((_, i) => scene.beats[i].focus?.length)
      .map((t) => [t.end, t.end + 0.2] as [number, number]),
  ];
  win.__setTime = async (time: number) => {
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
    const white = document.getElementById("white");
    if (white) {
      white.style.opacity = String(
        data.index === 0 || data.fadeFromBackground ? 1 - ease(time / 0.4) : 0,
      );
    }
  };
  win.__overflows = () => [
    ...[...document.querySelectorAll<SVGTextElement>("[data-fit]")].flatMap((el) => {
      const b = el.getBBox(),
        limit = JSON.parse(el.dataset.fit ?? "{}") as Box;
      return b.x < limit.x - 1 ||
        b.y < limit.y - 1 ||
        b.x + b.width > limit.x + limit.w + 1 ||
        b.y + b.height > limit.y + limit.h + 1
        ? [el.textContent ?? ""]
        : [];
    }),
  ];
  win.__setTime(0);
}
export function iconSvg(name: IconName, x: number, y: number, size: number): string {
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
export function mark(only?: MarkKind): string {
  const symbols = {
    check: '<path d="M-12 0L-3 10L14 -10"/>',
    cross: '<path d="M-11 -11L11 11M11 -11L-11 11"/>',
    question:
      '<path d="M-8 -8C-8 -20 16 -20 10 -3C8 1 0 1 0 7"/><circle cy="16" r="2" fill="white" stroke="none"/>',
    redo: '<path d="M13 -7A15 15 0 1 0 14 8M13 -18V-7H2"/>',
  };
  return `<g${only ? "" : ' class="mark"'}>${(["check", "cross", "question", "redo"] as const).map((kind, i) => (only && kind !== only ? "" : `<g data-kind="${kind}"><circle r="28" fill="${["#16A34A", "#E5342B", "#5C5C66", "#E62F9A"][i]}" stroke="white" stroke-width="3"/><g fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${symbols[kind]}</g></g>`)).join("")}</g>`;
}
export function sceneHtml(input: SceneHtmlInput): string {
  if (input.schema === 2 && input.previousFrame) input = { ...input, previousFrame: undefined };
  let html =
    input.scene.kind === "view"
      ? viewHtml(input)
      : input.scene.kind === "code"
        ? codeHtml(input)
        : boardHtml(input as BoardHtmlInput);
  if (input.previousFrame) {
    const overlay = `<img id="previous-code-frame" src="${escapeHtml(input.previousFrame)}" style="position:absolute;inset:0;width:1920px;height:1080px;z-index:3;pointer-events:none">`;
    html = html
      .replace("<script>", `${overlay}<script>`)
      .replace("</html>", `<script>(${codeTransitionRuntime.toString()})();</script></html>`);
  }
  if (input.scene.role === "quiz" && input.timing.think) {
    const overlay = `<style>
      #think-time{position:absolute;right:60px;top:32px;z-index:4;display:flex;align-items:center;gap:20px;padding:12px 16px 12px 24px;background:white;border:2px solid #DDDDE2;border-radius:16px;color:#5C5C66;font-size:28px;visibility:hidden}
      #think-seconds{fill:#5749DB;font-size:34px;font-weight:700}
    </style><div id="think-time">考える時間<svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="33" fill="none" stroke="#DDDDE2" stroke-width="6"/><circle id="think-ring" cx="36" cy="36" r="33" fill="none" stroke="#5749DB" stroke-width="6" pathLength="1" stroke-dasharray="1" transform="rotate(-90 36 36)"/><text id="think-seconds" x="36" y="36" text-anchor="middle" dominant-baseline="central"></text></svg></div>`;
    html = html
      .replace("<script>", `${overlay}<script>`)
      .replace(
        "</html>",
        `<script>(${thinkRuntime.toString()})(${JSON.stringify(input.timing.think)});</script></html>`,
      );
  }
  return withBeatOverlays(html, input);
}

export function sceneScriptData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function dialogOverflow(entry: HTMLElement): string[] | undefined {
  if (!entry.classList.contains("code-dialog")) return undefined;
  const bounds = [entry, ...entry.querySelectorAll<HTMLElement>(".dialog-title,.dialog-code")];
  return bounds.some(
    (box) => box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1,
  )
    ? [`ダイアログに文字が収まりません: ${entry.querySelector(".dialog-title")?.textContent}`]
    : [];
}

function beatOverlayRuntime(
  beats: { start: number; end: number; backdrop: string }[],
  extraOverflow?: (entry: HTMLElement) => string[] | undefined,
) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overflows = win.__overflows;
  const overlay = document.getElementById("beat-overlay") as HTMLElement;
  const entries = [...overlay.children] as HTMLElement[];
  const fade = 0.3;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
  for (const { start, end } of beats)
    win.__busyRanges.push([start, start + fade], [end, end + fade]);
  const draw = (time: number) => {
    const i = beats.findIndex(({ start, end }) => time >= start && time < end + fade);
    const beat = beats[i];
    const progress = beat ? clamp((time - beat.start) / fade) : 0;
    const opacity = beat ? Math.min(progress, clamp((beat.end + fade - time) / fade)) : 0;
    overlay.style.background = beat?.backdrop ?? "";
    overlay.style.opacity = String(opacity);
    overlay.style.visibility = opacity > 0 ? "visible" : "hidden";
    entries.forEach((entry, index) => {
      entry.hidden = index !== i;
      if (!entry.hidden && beat) {
        // 退場（end 以降）は enter が 1 なので、大きさは 1 のまま親の不透明度だけ下がる。
        const enter = time < beat.end ? ease((time - beat.start) / fade) : 1;
        entry.style.transform = `scale(${0.94 + 0.06 * enter})`;
        entry.style.transformOrigin = "center";
      }
    });
  };
  win.__setTime = async (time) => {
    await setTime(time);
    draw(time);
  };
  win.__overflows = () => [
    ...overflows(),
    ...entries.flatMap((entry) => {
      if (entry.hidden) return [];
      const extra = extraOverflow?.(entry);
      if (extra !== undefined) return extra;
      const text = entry.firstElementChild as HTMLElement | null;
      return text && text.scrollWidth > text.clientWidth + 1
        ? [`用語が画面に収まりません: ${text.textContent}`]
        : [];
    }),
  ];
  draw(0);
}

function withBeatOverlays(html: string, input: SceneHtmlInput): string {
  if (input.schema !== 2) return html;
  const beats = input.scene.beats.flatMap(({ term, dialog }, i) =>
    term || dialog
      ? [{ term, dialog, start: input.timing.beats[i].start, end: input.timing.beats[i].end }]
      : [],
  );
  if (!beats.length) return html;
  const hasDialog = beats.some(({ dialog }) => dialog);
  const overlay = `<style>
    #beat-overlay{position:absolute;inset:0;z-index:5;display:grid;place-items:center;color:white;text-align:center;opacity:0;visibility:hidden;pointer-events:none}
    ${
      beats.some(({ term }) => term)
        ? `
    .term-text{max-width:1800px;margin:auto;font-size:120px;font-weight:700;line-height:1.2;white-space:nowrap}
    .term-line{width:96px;height:6px;background:#E62F9A;margin:24px auto}
    .term-note{font-size:44px;color:#DDDDE2}
    .term-text rt{line-height:1}
    `
        : ""
    }
    ${
      hasDialog
        ? `
    ${input.scene.kind === "code" ? "" : codeFontCss + codeColorsCss}
    .code-dialog{width:1240px;border-radius:24px;background:white;box-shadow:0 16px 60px #00000040;overflow:hidden}
    .dialog-heading{position:relative;display:grid;place-items:center;height:88px;border-bottom:2px solid #DDDDE2}
    .dialog-heading::before{content:'';position:absolute;left:32px;width:16px;height:16px;border-radius:50%;background:#DDDDE2;box-shadow:28px 0 #DDDDE2,56px 0 #DDDDE2}
    .dialog-title{max-width:calc(100% - 240px);margin:0;color:#0E0E10;font-size:36px;font-weight:700;white-space:nowrap;overflow:hidden}
    .dialog-code{margin:32px;padding:32px;border-radius:12px;background:#16161A;color:#F4F4F6;text-align:left;line-height:1.5;font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:400;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;overflow:hidden}
    .dialog-code code{font:inherit}
    `
        : ""
    }
  </style><div id="beat-overlay">${beats
    .map(({ term, dialog }) => {
      if (term) {
        const text = escapeHtml(term.text);
        const label = term.ruby
          ? `<ruby>${text}<rt style="font-size:40px">${escapeHtml(term.ruby)}</rt></ruby>`
          : text;
        return `<div hidden><div class="term-text">${label}</div><div class="term-line"></div>${term.note ? `<div class="term-note">${escapeHtml(term.note)}</div>` : ""}</div>`;
      }
      if (!dialog) return "";
      const widest = Math.max(1, ...dialog.code.map(codeTextWidth));
      const fontSize = Math.min(34, Math.floor((1240 - 4 * 32) / widest));
      return `<div class="code-dialog" hidden><header class="dialog-heading"><h2 class="dialog-title">${escapeHtml(dialog.title)}</h2></header><pre class="dialog-code" style="font-size:${fontSize}px"><code>${highlightCode(dialog.code.join("\n"))}</code></pre></div>`;
    })
    .join("")}</div>`;
  const times = beats.map(({ start, end, dialog }) => ({
    start,
    end,
    backdrop: dialog ? "rgba(14,14,16,0.55)" : "rgba(14,14,16,0.78)",
  }));
  const overflow = hasDialog ? `,${dialogOverflow.toString()}` : "";
  return html
    .replace("<script>", () => `${overlay}<script>`)
    .replace(
      "</html>",
      () =>
        `<script>(${beatOverlayRuntime.toString()})(${sceneScriptData(times)}${overflow});</script></html>`,
    );
}

function thinkRuntime({ start, duration }: NonNullable<SceneTimeline["think"]>) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overlay = document.getElementById("think-time") as HTMLElement;
  const seconds = document.getElementById("think-seconds") as unknown as SVGTextElement;
  const ring = document.getElementById("think-ring") as unknown as SVGCircleElement;
  const fade = 0.3;
  const end = start + duration;
  win.__busyRanges.push([start - fade, end + fade]);
  win.__setTime = async (time) => {
    await setTime(time);
    const opacity = Math.max(
      0,
      Math.min(1, (time - start + fade) / fade, (end + fade - time) / fade),
    );
    const remaining = Math.max(0, Math.min(duration, end - time));
    overlay.style.visibility = opacity > 0 ? "visible" : "hidden";
    overlay.style.opacity = String(opacity);
    seconds.textContent = String(Math.max(1, Math.ceil(remaining - 1e-9)));
    ring.setAttribute("stroke-dashoffset", String(1 - remaining / duration));
  };
  win.__setTime(0);
}

/** イラストと同じ0.4秒のクロスフェード。既存のview/board同士には適用しない。 */
function codeTransitionRuntime() {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overlay = document.getElementById("previous-code-frame") as HTMLImageElement;
  win.__busyRanges.push([0, 0.4]);
  win.__setTime = async (time) => {
    await setTime(time);
    overlay.style.opacity = String(Math.max(0, Math.min(1, 1 - time / 0.4)));
  };
  win.__setTime(0);
}
/** 札はノードの中で描き、ノードの透明度・拡大・カメラを引き継ぐ。 */
function boardTagRuntime(state: SceneState, timing: SceneTimeline) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overflows = win.__overflows;
  const tags = [...document.querySelectorAll<SVGSVGElement>("[data-board-tag]")].map(
    (container) => ({
      id: container.dataset.boardTag as string,
      variants: [...container.querySelectorAll<SVGGElement>("[data-value]")],
      width: Number(container.getAttribute("width")),
    }),
  );
  const value = (snapshot: BoardState, id: string) =>
    snapshot.tags && Object.hasOwn(snapshot.tags, id) ? snapshot.tags[id] : undefined;
  const changes = state.beats.map(({ before, after }) =>
    tags.map(({ id }) => ({ from: value(before, id), to: value(after, id) })),
  );
  changes.forEach((beat, i) => {
    const start = timing.beats[i].start;
    for (const { from, to } of beat)
      if (from !== to) win.__busyRanges.push([start, start + (to ? (from ? 0.5 : 0.35) : 0.2)]);
  });
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  win.__setTime = async (time) => {
    await setTime(time);
    const i = timing.beats.findLastIndex((beat) => beat.start <= time);
    const elapsed = i < 0 ? 0 : time - timing.beats[i].start;
    tags.forEach(({ id, variants }, j) => {
      const initial = value(state.start, id);
      const { from, to } = changes[i]?.[j] ?? { from: initial, to: initial };
      for (const variant of variants) {
        const text = variant.dataset.value;
        let opacity = text === to ? 1 : 0;
        let scale = 1;
        if (from !== to && text === from) opacity = 1 - clamp(elapsed / (to ? 0.15 : 0.2));
        if (from !== to && text === to) {
          const progress = clamp((elapsed - (from ? 0.15 : 0)) / 0.35);
          opacity = 1 - (1 - progress) ** 3;
          scale = 0.9 + 0.1 * opacity + 0.12 * Math.sin(progress * Math.PI);
        }
        variant.setAttribute("opacity", String(opacity));
        variant.setAttribute("transform", `scale(${scale})`);
      }
    });
  };
  win.__overflows = () => [
    ...overflows(),
    ...tags.flatMap(({ id, variants, width }) =>
      variants.flatMap((variant) => {
        const text = variant.querySelector<SVGTextElement>("text");
        return text && text.getComputedTextLength() + 40 > width
          ? [`ノード「${id}」の札「${text.textContent}」が収まりません`]
          : [];
      }),
    ),
  ];
  win.__setTime(0);
}

/** schema 2 の札。0.94 から 1 へフェードし、入れ替えは消してから同じ出方をする。 */
function lessonBoardTagRuntime(state: SceneState, timing: SceneTimeline) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overflows = win.__overflows;
  const tags = [...document.querySelectorAll<SVGSVGElement>("[data-board-tag]")].map(
    (container) => ({
      id: container.dataset.boardTag as string,
      variants: [...container.querySelectorAll<SVGGElement>("[data-value]")],
      width: Number(container.getAttribute("width")),
    }),
  );
  const value = (snapshot: BoardState, id: string) =>
    snapshot.tags && Object.hasOwn(snapshot.tags, id) ? snapshot.tags[id] : undefined;
  const changes = state.beats.map(({ before, after }) =>
    tags.map(({ id }) => ({ from: value(before, id), to: value(after, id) })),
  );
  changes.forEach((beat, i) => {
    const start = timing.beats[i].start;
    for (const { from, to } of beat)
      if (from !== to) win.__busyRanges.push([start, start + (to ? (from ? 0.5 : 0.35) : 0.2)]);
  });
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
  win.__setTime = async (time) => {
    await setTime(time);
    const i = timing.beats.findLastIndex((beat) => beat.start <= time);
    const elapsed = i < 0 ? 0 : time - timing.beats[i].start;
    tags.forEach(({ id, variants }, j) => {
      const initial = value(state.start, id);
      const { from, to } = changes[i]?.[j] ?? { from: initial, to: initial };
      for (const variant of variants) {
        const text = variant.dataset.value;
        let opacity = text === to ? 1 : 0;
        let scale = 1;
        if (from !== to && text === from) {
          opacity = 1 - ease(elapsed / (to ? 0.15 : 0.2));
          scale = 1;
        }
        if (from !== to && text === to) {
          const progress = ease((elapsed - (from ? 0.15 : 0)) / 0.35);
          opacity = progress;
          scale = 0.94 + 0.06 * progress;
        }
        variant.setAttribute("opacity", String(opacity));
        variant.setAttribute("transform", `scale(${scale})`);
      }
    });
  };
  win.__overflows = () => [
    ...overflows(),
    ...tags.flatMap(({ id, variants, width }) =>
      variants.flatMap((variant) => {
        const text = variant.querySelector<SVGTextElement>("text");
        return text && text.getComputedTextLength() + 40 > width
          ? [`ノード「${id}」の札「${text.textContent}」が収まりません`]
          : [];
      }),
    ),
  ];
  win.__setTime(0);
}

/**
 * schema 2 の概念図。runtime の拡大を上書きし、入場だけ 0.94→1、強調は枠の色にする。
 * runtime のあとに実行する。
 */
function lessonBoardMotion(data: RenderData) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const { board, state, timing, layout } = data;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
  const ids = [...(board.zones ?? []), ...board.nodes, ...(board.links ?? [])].map((e) => e.id);
  const elements = new Map(
    ids.map((id) => [id, document.getElementById(`element-${id}`) as unknown as SVGGElement]),
  );
  const showSeconds = 0.5,
    zoneNodeDelay = 0.3;
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
  // 空の囲みの中身は runtime と同じだけ遅らせ、拡大の進行を不透明度とそろえる。
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
  const emphasis = (id: string, index: number, time: number, elapsed: number) => {
    const beat = index >= 0 ? state.beats[index] : undefined;
    const timed = index >= 0 ? timing.beats[index] : undefined;
    if (!beat || !timed) return 0;
    const inBefore = (beat.before.emphasis ?? []).includes(id);
    const inAfter = (beat.after.emphasis ?? []).includes(id);
    const focused = beat.focus.includes(id);
    if (beat.focus.length && time < timed.end) {
      if (focused) return inBefore ? 1 : clamp(elapsed / 0.2);
      return inBefore ? 1 - clamp(elapsed / 0.2) : 0;
    }
    if (beat.focus.length && time < timed.end + 0.2) {
      const t = clamp((time - timed.end) / 0.2);
      if (focused && inAfter) return 1;
      if (focused) return 1 - t;
      return inAfter ? t : 0;
    }
    if (inAfter && inBefore) return 1;
    if (inAfter) return clamp(elapsed / 0.2);
    if (inBefore) return 1 - clamp(elapsed / 0.2);
    return 0;
  };
  win.__setTime = async (time: number) => {
    await setTime(time);
    let k = -1;
    for (let i = 0; i < timing.beats.length; i++) if (timing.beats[i].start <= time) k = i;
    const bt = k >= 0 ? timing.beats[k] : undefined;
    const bs = k >= 0 ? state.beats[k] : undefined;
    const elapsed = bt ? time - bt.start : 0;
    for (const id of ids) {
      const el = elements.get(id);
      if (!el) continue;
      const showElapsed = elapsed - (delayedShows[k]?.has(id) ? zoneNodeDelay : 0);
      const box = layout.nodes[id] ?? layout.zones[id];
      if (box) {
        const was = bs?.before.visible.includes(id) ?? false;
        const now = (bs?.after ?? state.start).visible.includes(id);
        const appearing = Boolean(bs) && !was && now;
        const s = appearing ? 0.94 + 0.06 * ease(showElapsed / showSeconds) : 1;
        const cx = box.x + box.w / 2,
          cy = box.y + box.h / 2;
        el.setAttribute("transform", `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
      }
      const strength = emphasis(id, k, time, elapsed);
      const ring = el.querySelector(".ring");
      if (ring) {
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "#E62F9A");
        ring.setAttribute("stroke-width", "4");
        ring.setAttribute("opacity", String(strength));
      }
      const link = el.querySelector(".link");
      const accent = el.querySelector(".link-accent");
      if (link) {
        link.setAttribute("stroke", "#5C5C66");
        link.setAttribute("stroke-width", "3");
        const show = Boolean(
          bs && !bs.before.visible.includes(id) && bs.after.visible.includes(id),
        );
        const drawing = show && showElapsed < 0.45;
        link.setAttribute("marker-end", drawing ? "" : "url(#arrow)");
        if (accent) {
          const dash = link.getAttribute("stroke-dasharray");
          const offset = link.getAttribute("stroke-dashoffset");
          if (dash != null) accent.setAttribute("stroke-dasharray", dash);
          if (offset != null) accent.setAttribute("stroke-dashoffset", offset);
          accent.setAttribute("opacity", String(strength));
          accent.setAttribute("marker-end", drawing ? "" : "url(#arrow-accent)");
        }
      }
      const mark = el.querySelector(".mark");
      if (mark) {
        const beforeKind = bs?.before.marks[id];
        const afterKind = (bs?.after ?? state.start).marks[id];
        let kind = afterKind;
        let opacity = afterKind ? 1 : 0;
        let s = 1;
        if (!bs) {
          kind = state.start.marks[id];
          opacity = kind ? 1 : 0;
          s = 1;
        } else if (afterKind && afterKind !== beforeKind) {
          const entered = ease(elapsed / 0.35);
          kind = afterKind;
          opacity = entered;
          s = 0.94 + 0.06 * entered;
        } else if (!afterKind && beforeKind) {
          const entered = ease(elapsed / 0.3);
          kind = beforeKind;
          opacity = 1 - entered;
          s = 1;
        }
        mark.setAttribute("opacity", String(opacity));
        const x = (box?.x ?? 0) + (box?.w ?? 0) - 4,
          y = (box?.y ?? 0) + 10;
        mark.setAttribute("transform", `translate(${x} ${y}) scale(${s})`);
        for (const item of mark.querySelectorAll<SVGElement>("[data-kind]"))
          item.setAttribute("display", item.dataset.kind === kind ? "inline" : "none");
      }
    }
  };
  win.__setTime(0);
}

function boardTag(id: string, box: Box, states: BoardState[]): string {
  const values = new Set(
    states.flatMap(({ tags }) => (tags && Object.hasOwn(tags, id) ? [tags[id]] : [])),
  );
  if (!values.size) return "";
  // 右上の印に重ならないよう、左右に同じ余白を確保する。
  const width = box.w - 64;
  return `<svg data-board-tag="${escapeHtml(id)}" x="${box.x + 32}" y="${box.y - 32}" width="${width}" height="64" viewBox="${-width / 2} -32 ${width} 64" overflow="hidden">${[
    ...values,
  ]
    .map((value) => {
      const w = Math.min(
        width,
        40 +
          Array.from(value).reduce(
            (sum, char) => sum + (/[\x20-\x7e\uff61-\uff9f]/u.test(char) ? 20 : 34),
            0,
          ),
      );
      return `<g data-value="${escapeHtml(value)}" opacity="0"><rect x="${-w / 2}" y="-28" width="${w}" height="56" rx="16" fill="#5749DB"/><text x="0" y="0" style="fill:white;white-space:pre" font-size="34" font-weight="700" text-anchor="middle" dominant-baseline="central">${escapeHtml(value)}</text></g>`;
    })
    .join("")}</svg>`;
}

function boardHtml(input: BoardHtmlInput): string {
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
  const tagStates = [input.state.start, ...input.state.beats.map((beat) => beat.after)];
  const tags = tagStates.some((state) => state.tags && Object.keys(state.tags).length);
  const nodes = input.board.nodes
    .map((n) => {
      const b = layout.nodes[n.id],
        size = b.h < 160 ? 40 : 76,
        compact = b.h < 100;
      const artLabelHeight = 72;
      const zone = input.board.zones?.find(
        (z) =>
          n.at[0] >= z.cells[0] &&
          n.at[0] < z.cells[0] + z.cells[2] &&
          n.at[1] >= z.cells[1] &&
          n.at[1] < z.cells[1] + z.cells[3],
      );
      return `<g id="element-${escapeHtml(n.id)}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="16" fill="white" stroke="#DDDDE2" stroke-width="2.5" filter="url(#shadow)"/><rect class="ring" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="16" fill="rgba(230,47,154,0.08)" stroke="#E62F9A" stroke-width="3"/><g style="color:${toneColor(zone?.tone) ?? "#0E0E10"}">${n.art ? `<image href="${escapeHtml(input.images?.[`art:${n.art}`]?.url ?? "")}" x="${b.x + 8}" y="${compact ? b.y + (b.h - size) / 2 : b.y + 8}" width="${compact ? size : b.w - 16}" height="${compact ? size : b.h - artLabelHeight - 16}" preserveAspectRatio="xMidYMid meet"/>` : iconSvg(n.icon ?? "file", compact ? b.x + 8 : b.x + (b.w - size) / 2, compact ? b.y + (b.h - size) / 2 : b.y + 14, size)}</g>${label(n.label, compact ? { x: b.x + size + 16, y: b.y + 6, w: b.w - size - 24, h: b.h - 12 } : { x: b.x + 6, y: n.art ? b.y + b.h - 80 : b.y + size + 16, w: b.w - 12, h: n.art ? artLabelHeight : b.h - size - 20 })}${tags ? boardTag(n.id, b, tagStates) : ""}${mark()}</g>`;
    })
    .join("");
  const links = (input.board.links ?? [])
    .map((l) => {
      const p = layout.links[l.id];
      const length = Array.from(l.label ?? "").length;
      const d = linkPath(p);
      const accent =
        input.schema === 2
          ? `<path class="link-accent" d="${d}" fill="none" stroke="#E62F9A" stroke-width="3" stroke-linejoin="round" opacity="0" marker-end="url(#arrow-accent)"/>`
          : "";
      return `<g id="element-${escapeHtml(l.id)}"><path class="link" d="${d}" fill="none" stroke="#5C5C66" stroke-width="3" stroke-linejoin="round" marker-end="url(#arrow)"/>${accent}${l.label ? `<rect x="${p.label.x - length * 20 - 10}" y="${p.label.y - 28}" width="${length * 40 + 20}" height="56" rx="8" fill="#FFFFFF"/>${label(l.label, { x: p.label.x - 140, y: p.label.y - 28, w: 280, h: 56 })}` : ""}</g>`;
    })
    .join("");
  const { schema: _schema, ...renderInput } = input;
  // 移動の尺に間を含めず、移動が済んだ絵を保つ。
  if (input.scene.beats.some((beat) => beat.travel && (beat.pause || beat.term || beat.dialog))) {
    renderInput.timing = {
      ...input.timing,
      beats: input.timing.beats.map((timed, i) => {
        const beat = input.scene.beats[i];
        return beat.travel && (beat.pause || beat.term || beat.dialog)
          ? {
              ...timed,
              end:
                beat.term || beat.dialog
                  ? (timed.speechEnd ?? timed.end)
                  : timed.end - (beat.pause ?? 0),
            }
          : timed;
      }),
    };
  }
  const tagRuntime = input.schema === 2 ? lessonBoardTagRuntime : boardTagRuntime;
  const tagScript = tags
    ? `<script>(${tagRuntime.toString()})(${JSON.stringify(input.state).replace(/</g, "\\u003c")},${JSON.stringify(input.timing).replace(/</g, "\\u003c")});</script>`
    : "";
  const data = JSON.stringify({ ...renderInput, layout }).replace(/</g, "\\u003c");
  const lessonScript =
    input.schema === 2 ? `<script>(${lessonBoardMotion.toString()})(${data});</script>` : "";
  return `<!doctype html><!-- ${iconLicense} --><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#FFFFFF;color:#0E0E10;font-family:'Noto Sans JP',sans-serif;font-weight:500}svg text{fill:#0E0E10}#diagram{position:absolute;left:0;top:100px;width:1920px;height:760px;overflow:hidden}#white{position:absolute;inset:0;z-index:2;background:white;pointer-events:none}
  </style>${Object.values(input.images ?? {})
    .map((img) => `<img hidden src="${escapeHtml(img.url)}">`)
    .join(
      "",
    )}<svg id="diagram" viewBox="0 170 1920 760"><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.05"/></filter>${["arrow", "arrow-accent"].map((id, i) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9Z" fill="${i ? "#E62F9A" : "#5C5C66"}"/></marker>`).join("")}</defs>${zones}${links}${nodes}<g id="traveler" style="color:white"><circle r="27" fill="#E62F9A"/>${Object.keys(
    VIDEO_ICONS,
  )
    .map((name) => `<g data-icon="${name}">${iconSvg(name as IconName, -18, -18, 36)}</g>`)
    .join(
      "",
    )}</g></svg><div id="white"></div><script>const travelPoint=${travelPoint.toString()};(${runtime.toString()})(${data}, travelPoint);</script>${tagScript}${lessonScript}</html>`;
}
