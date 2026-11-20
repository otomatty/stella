import { codeHtml } from "./scene-code-html.js";
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
import {
  sceneCaptionAt,
  sceneTitleOpacity,
  type SceneTimeline,
  type TextScene,
} from "../../src/scene-timeline.js";
import {
  VIDEO_ICONS,
  rubyParts,
  sceneRoleLabel,
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
export const sceneCaptionCss =
  "#caption{position:absolute;left:72px;right:72px;top:990px;height:90px;display:flex;align-items:center;justify-content:center;font-size:34px;line-height:1.3;color:#0E0E10;text-align:center;z-index:1;overflow:hidden}#caption span{display:block;width:100%;overflow-wrap:anywhere}";
export interface SceneHtmlInput {
  board: Board;
  schema?: VideoStoryboard["schema"];
  ruby?: VideoStoryboard["ruby"];
  images?: Record<string, ViewImage>;
  previousView?: ViewSceneState;
  /** code の前後だけ、直前の場面の最終コマを重ねてクロスフェードする。 */
  previousFrame?: string;
  scene: Scene;
  state: SceneState | ViewSceneState | CodeSceneState;
  timing: SceneTimeline;
  index: number;
  total: number;
  previous?: Scene;
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
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#F7F7F9;color:#0E0E10;font-family:'Noto Sans JP',sans-serif;font-weight:500}
  body{display:flex;align-items:center;justify-content:center}#text-scene{width:1680px;text-align:center;overflow-wrap:anywhere;opacity:0}#text-scene header{font-size:32px;color:#5C5C66;margin-bottom:24px}#text-scene h1{font-size:80px;font-weight:700;line-height:1.4;margin:0}#accent{width:96px;height:6px;background:#E62F9A;margin:40px auto 0}#white{position:absolute;inset:0;background:white;pointer-events:none}
  </style><main id="text-scene">${scene.header ? `<header>${escapeHtml(scene.header)}</header>` : ""}<h1>${escapeHtml(scene.title)}</h1><div id="accent"></div></main><div id="white"></div><script>(${textRuntime.toString()})(${data});</script></html>`;
}
function runtime(
  data: RenderData,
  interpolate: typeof travelPoint,
  titleOpacity: typeof sceneTitleOpacity,
  captionAt: typeof sceneCaptionAt,
) {
  const win = window as unknown as ScenePageWindow;
  const { board, scene, state, timing, layout } = data;
  const caption = document.getElementById("caption") as HTMLElement;
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    [2.6, 3.0],
    ...timing.beats.map((b): [number, number] => [
      b.speechEnd ?? b.end,
      (b.speechEnd ?? b.end) + 1 / 30,
    ]),
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
  win.__setTime = async (time: number) => {
    caption.innerHTML = `<span>${safe(captionAt(timing, time))}</span>`;
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
    const title = document.getElementById("heading");
    if (title) title.style.opacity = String(titleOpacity(time));
    const white = document.getElementById("white");
    if (white) {
      white.style.background = data.fadeFromBackground ? "#F7F7F9" : "white";
      white.style.opacity = String(
        data.index === 0 || data.fadeFromBackground ? 1 - ease(time / 0.4) : 0,
      );
    }
  };
  win.__overflows = () => [
    ...((caption.firstElementChild as HTMLElement).scrollHeight > 90
      ? [`字幕が2行に収まりません: ${caption.textContent}`]
      : []),
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
  return withTerms(withRuby(html, input), input);
}

export function rubyHtml(
  text: string,
  dictionary: Record<string, string>,
  alreadyRead?: Set<string>,
  size = "0.45em",
): string {
  const parts = rubyParts(text, dictionary);
  const html = parts
    .map(({ text, reading }) =>
      reading && !alreadyRead?.has(text)
        ? `<ruby>${escapeHtml(text)}<rt style="font-size:${size}">${escapeHtml(reading)}</rt></ruby>`
        : escapeHtml(text),
    )
    .join("");
  for (const part of parts) if (part.reading) alreadyRead?.add(part.text);
  return html;
}

export function sceneScriptData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function rubyWidth(text: string, dictionary: Record<string, string>, fontSize: number): number {
  return rubyParts(text, dictionary).reduce(
    (width, part) =>
      width +
      fontSize *
        Math.max(Array.from(part.text).length, Array.from(part.reading ?? "").length * 0.45),
    0,
  );
}

const rubyBoxCss = `
  .ruby-box{display:grid;align-content:center;text-align:center;width:100%;height:100%;line-height:1.2;overflow:hidden;overflow-wrap:anywhere}
  .ruby-box span{display:block;min-width:0}
`;

function rubyBox(text: string, html: string, box: Box, size: number, color = "#0E0E10") {
  return `<foreignObject x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"><div class="ruby-box" data-ruby-fit="${escapeHtml(text)}" style="font-size:${size}px;color:${color}"><span>${html}</span></div></foreignObject>`;
}

function rubyRuntime(
  captions: ({ start: number; end: number; html: string } | undefined)[],
  labels: [string, string][],
  boxOf: typeof rubyBox,
) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overflows = win.__overflows;
  const markup = new Map(labels);
  const caption = document.getElementById("caption") as HTMLElement;
  const draw = (time: number) => {
    const active = captions.find((b) => b && time >= b.start && time < b.end);
    if (active) caption.innerHTML = `<span class="ruby-caption">${active.html}</span>`;
    for (const label of document.querySelectorAll<HTMLElement>(
      ".figure-label,.figure-tag,.figure-arrow-label",
    )) {
      const html = markup.get(label.textContent ?? "");
      if (html) {
        label.dataset.rubyFit = label.textContent ?? "";
        label.innerHTML = `<span>${html}</span>`;
      }
    }
    for (const label of document.querySelectorAll<SVGTextElement>(
      "#surface > g > rect + path + text",
    )) {
      const text = label.textContent ?? "";
      const html = markup.get(text);
      const rect = label.previousElementSibling?.previousElementSibling;
      if (!html || !rect) continue;
      const get = (attr: string) => Number(rect.getAttribute(attr));
      // 既存の札の枠に合わせ、フリガナを含む文字を中央へ置く。
      label.insertAdjacentHTML(
        "afterend",
        boxOf(
          text,
          html,
          { x: get("x") + 8, y: get("y"), w: get("width") - 16, h: get("height") },
          35,
        ),
      );
      label.remove();
    }
  };
  win.__setTime = async (time) => {
    await setTime(time);
    draw(time);
  };
  win.__overflows = () => [
    ...overflows(),
    ...[...document.querySelectorAll<HTMLElement>("[data-ruby-fit],.ruby-caption")].flatMap(
      (box) => {
        const limit = box.matches(".figure-tag,.figure-arrow-label")
          ? (box.parentElement ?? box)
          : box.matches(".ruby-caption")
            ? caption
            : box;
        const content =
          box.firstElementChild && !box.matches(".ruby-caption") ? box.firstElementChild : box;
        const bounds = limit.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(content);
        return [...range.getClientRects()].some(
          (r) =>
            r.width > 0 &&
            r.height > 0 &&
            (r.left < bounds.left - 1 ||
              r.right > bounds.right + 1 ||
              r.top < bounds.top - 1 ||
              r.bottom > bounds.bottom + 1),
        )
          ? [`フリガナ付きの文字が収まりません: ${box.dataset.rubyFit ?? box.textContent}`]
          : [];
      },
    ),
  ];
  win.__setTime(0);
}

function withRuby(html: string, input: SceneHtmlInput): string {
  const dictionary = input.ruby;
  if (!dictionary || !Object.keys(dictionary).length) return html;
  const seen = new Set<string>();
  const captions = input.timing.beats.map((beat) => {
    const html = rubyHtml(beat.say, dictionary, seen);
    if (html.includes("<ruby>"))
      return { start: beat.speechStart ?? beat.start, end: beat.speechEnd ?? beat.end, html };
    return undefined;
  });
  const scene = input.scene;
  const labels =
    scene.kind === "view"
      ? scene.beats.flatMap((beat) => beat.label?.map((label) => label.text) ?? [])
      : scene.kind === "code" && scene.panel?.kind === "figure"
        ? [
            ...input.board.nodes.map((node) => node.label),
            ...(input.board.links ?? []).flatMap(({ label }) => (label ? [label] : [])),
            ...[
              ...((input.state as CodeSceneState).figure?.beats ?? []).map((beat) => beat.after),
              (input.state as CodeSceneState).figure?.start,
            ].flatMap((snapshot) => Object.values(snapshot?.tags ?? {})),
          ]
        : [];
  const markup = [...new Set(labels)].flatMap((label) => {
    const html = rubyHtml(label, dictionary);
    return html.includes("<ruby>") ? [[label, html]] : [];
  });
  if (!captions.some(Boolean) && !markup.length && !html.includes('data-ruby-fit="')) return html;
  return html
    .replace(
      "</style>",
      `${rubyBoxCss}
      #caption .ruby-caption{line-height:1.2}
      .figure-label[data-ruby-fit]{line-height:1.2}
      .figure-tag[data-ruby-fit]{height:64px;line-height:1.2}
      .figure-arrow-label[data-ruby-fit]{line-height:1.2}
    </style>`,
    )
    .replace(
      "</html>",
      () =>
        `<script>const escapeHtml=${escapeHtml.toString()};(${rubyRuntime.toString()})(${sceneScriptData(captions)},${sceneScriptData(markup)},${rubyBox.toString()});</script></html>`,
    );
}

function termRuntime(terms: { start: number; end: number }[]) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overflows = win.__overflows;
  const overlay = document.getElementById("term-overlay") as HTMLElement;
  const caption = document.getElementById("caption") as HTMLElement;
  const entries = [...overlay.children] as HTMLElement[];
  const fade = 0.3;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  for (const { start, end } of terms)
    win.__busyRanges.push([start, start + fade], [end, end + fade]);
  const draw = (time: number) => {
    const i = terms.findIndex(({ start, end }) => time >= start && time < end + fade);
    const term = terms[i];
    const progress = term ? clamp((time - term.start) / fade) : 0;
    const opacity = term ? Math.min(progress, clamp((term.end + fade - time) / fade)) : 0;
    overlay.style.opacity = String(opacity);
    overlay.style.visibility = opacity > 0 ? "visible" : "hidden";
    caption.style.zIndex = opacity > 0 ? "6" : "";
    caption.style.color = opacity > 0 ? "white" : "";
    entries.forEach((entry, index) => {
      entry.hidden = index !== i;
      if (!entry.hidden)
        entry.style.transform = `scale(${1 + 0.06 * Math.sin(progress * Math.PI)})`;
    });
  };
  win.__setTime = async (time) => {
    await setTime(time);
    draw(time);
  };
  win.__overflows = () => [
    ...overflows(),
    ...entries.flatMap((entry) => {
      const text = entry.firstElementChild as HTMLElement | null;
      return !entry.hidden && text && text.scrollWidth > text.clientWidth + 1
        ? [`用語が画面に収まりません: ${text.textContent}`]
        : [];
    }),
  ];
  draw(0);
}

function withTerms(html: string, input: SceneHtmlInput): string {
  if (input.schema !== 2) return html;
  const terms = input.scene.beats.flatMap(({ term }, i) =>
    term ? [{ term, start: input.timing.beats[i].start, end: input.timing.beats[i].end }] : [],
  );
  if (!terms.length) return html;
  const overlay = `<style>
    #term-overlay{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(14,14,16,0.78);color:white;text-align:center;opacity:0;visibility:hidden;pointer-events:none}
    .term-text{max-width:1800px;margin:auto;font-size:120px;font-weight:700;line-height:1.2;white-space:nowrap}
    .term-line{width:96px;height:6px;background:#E62F9A;margin:24px auto}
    .term-note{font-size:44px;color:#DDDDE2}
    .term-text rt{line-height:1}
  </style><div id="term-overlay">${terms
    .map(({ term }) => {
      const text = term.ruby
        ? rubyHtml(term.text, { [term.text]: term.ruby }, undefined, "40px")
        : rubyHtml(term.text, input.ruby ?? {}, undefined, "40px");
      return `<div hidden><div class="term-text">${text}</div><div class="term-line"></div>${term.note ? `<div class="term-note">${escapeHtml(term.note)}</div>` : ""}</div>`;
    })
    .join("")}</div>`;
  return html
    .replace("<script>", () => `${overlay}<script>`)
    .replace(
      "</html>",
      () =>
        `<script>(${termRuntime.toString()})(${sceneScriptData(terms.map(({ start, end }) => ({ start, end })))});</script></html>`,
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

function boardTag(
  id: string,
  box: Box,
  states: BoardState[],
  dictionary: Record<string, string>,
): string {
  const values = new Set(
    states.flatMap(({ tags }) => (tags && Object.hasOwn(tags, id) ? [tags[id]] : [])),
  );
  if (!values.size) return "";
  // 右上の印に重ならないよう、左右に同じ余白を確保する。
  const width = box.w - 64;
  const readings = new Map([...values].map((value) => [value, rubyHtml(value, dictionary)]));
  const rubyHeight = [...readings.values()].some((html) => html.includes("<ruby>")) ? 76 : 64;
  return `<svg data-board-tag="${escapeHtml(id)}" x="${box.x + 32}" y="${box.y - rubyHeight / 2}" width="${width}" height="${rubyHeight}" viewBox="${-width / 2} ${-rubyHeight / 2} ${width} ${rubyHeight}" overflow="hidden">${[
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
      const html = readings.get(value) ?? "";
      if (html.includes("<ruby>")) {
        const tagWidth = Math.min(width, Math.max(w, rubyWidth(value, dictionary, 34) + 40));
        return `<g data-value="${escapeHtml(value)}" opacity="0"><rect x="${-tagWidth / 2}" y="-36" width="${tagWidth}" height="72" rx="16" fill="#5749DB"/>${rubyBox(value, html, { x: -tagWidth / 2 + 6, y: -36, w: tagWidth - 12, h: 72 }, 34, "white")}</g>`;
      }
      return `<g data-value="${escapeHtml(value)}" opacity="0"><rect x="${-w / 2}" y="-28" width="${w}" height="56" rx="16" fill="#5749DB"/><text x="0" y="0" style="fill:white;white-space:pre" font-size="34" font-weight="700" text-anchor="middle" dominant-baseline="central">${escapeHtml(value)}</text></g>`;
    })
    .join("")}</svg>`;
}

function boardHtml(input: BoardHtmlInput): string {
  const toneColor = (tone?: "blue" | "violet") =>
    tone === "blue" ? "#2563EB" : tone === "violet" ? "#8330C7" : undefined;
  const layout = layoutBoard(input.board);
  const dictionary = input.ruby ?? {};
  const withLabelRuby = (text: string, box: Box) => {
    const html = rubyHtml(text, dictionary);
    return html.includes("<ruby>") ? rubyBox(text, html, box, 36) : label(text, box);
  };
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
      const ruby = rubyHtml(n.label, dictionary).includes("<ruby>");
      const artLabelHeight = ruby ? 84 : 72;
      const zone = input.board.zones?.find(
        (z) =>
          n.at[0] >= z.cells[0] &&
          n.at[0] < z.cells[0] + z.cells[2] &&
          n.at[1] >= z.cells[1] &&
          n.at[1] < z.cells[1] + z.cells[3],
      );
      return `<g id="element-${escapeHtml(n.id)}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="16" fill="white" stroke="#DDDDE2" stroke-width="2.5" filter="url(#shadow)"/><rect class="ring" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="16" fill="rgba(230,47,154,0.08)" stroke="#E62F9A" stroke-width="3"/><g style="color:${toneColor(zone?.tone) ?? "#0E0E10"}">${n.art ? `<image href="${escapeHtml(input.images?.[`art:${n.art}`]?.url ?? "")}" x="${b.x + 8}" y="${compact ? b.y + (b.h - size) / 2 : b.y + 8}" width="${compact ? size : b.w - 16}" height="${compact ? size : b.h - artLabelHeight - 16}" preserveAspectRatio="xMidYMid meet"/>` : iconSvg(n.icon ?? "file", compact ? b.x + 8 : b.x + (b.w - size) / 2, compact ? b.y + (b.h - size) / 2 : b.y + 14, size)}</g>${withLabelRuby(n.label, compact ? { x: b.x + size + 16, y: b.y + 6, w: b.w - size - 24, h: b.h - 12 } : { x: b.x + 6, y: n.art ? b.y + b.h - (ruby ? 92 : 80) : b.y + size + 16, w: b.w - 12, h: n.art ? artLabelHeight : b.h - size - 20 })}${tags ? boardTag(n.id, b, tagStates, dictionary) : ""}${mark()}</g>`;
    })
    .join("");
  const links = (input.board.links ?? [])
    .map((l) => {
      const p = layout.links[l.id];
      const ruby = !!l.label && rubyHtml(l.label, dictionary).includes("<ruby>");
      const height = ruby ? 68 : 56;
      const length = Array.from(l.label ?? "").length;
      const width = l.label
        ? (ruby ? Math.max(length * 40, rubyWidth(l.label, dictionary, 36)) : length * 40) + 20
        : 0;
      return `<g id="element-${escapeHtml(l.id)}"><path class="link" d="${linkPath(p)}" fill="none" stroke="#5C5C66" stroke-width="3" stroke-linejoin="round" marker-end="url(#arrow)"/>${l.label ? `<rect x="${ruby ? p.label.x - width / 2 : p.label.x - length * 20 - 10}" y="${p.label.y - height / 2}" width="${width}" height="${height}" rx="8" fill="#F7F7F9"/>${withLabelRuby(l.label, { x: p.label.x - (ruby ? width - 12 : 280) / 2, y: p.label.y - height / 2, w: ruby ? width - 12 : 280, h: height })}` : ""}</g>`;
    })
    .join("");
  const heading = (s: Scene | undefined) =>
    s ? `<span>${sceneRoleLabel(s)}</span> ${escapeHtml(s.title)}` : "";
  const { previous: _previous, ruby: _ruby, schema: _schema, ...renderInput } = input;
  const sameTitle =
    input.previous?.role === input.scene.role &&
    input.previous?.point === input.scene.point &&
    input.previous?.title === input.scene.title;
  // 移動の尺に間を含めず、移動が済んだ絵を保つ。
  if (input.scene.beats.some((beat) => beat.travel && (beat.pause || beat.term))) {
    renderInput.timing = {
      ...input.timing,
      beats: input.timing.beats.map((timed, i) => {
        const beat = input.scene.beats[i];
        return beat.travel && (beat.pause || beat.term)
          ? {
              ...timed,
              end: beat.term ? (timed.speechEnd ?? timed.end) : timed.end - (beat.pause ?? 0),
            }
          : timed;
      }),
    };
  }
  const tagScript = tags
    ? `<script>(${boardTagRuntime.toString()})(${JSON.stringify(input.state).replace(/</g, "\\u003c")},${JSON.stringify(input.timing).replace(/</g, "\\u003c")});</script>`
    : "";
  const data = JSON.stringify({ ...renderInput, layout }).replace(/</g, "\\u003c");
  return `<!doctype html><!-- ${iconLicense} --><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}${sceneCaptionCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#F7F7F9;color:#0E0E10;font-family:'Noto Sans JP',sans-serif;font-weight:500}#heading{position:absolute;top:24px;left:50%;transform:translateX(-50%);white-space:nowrap;z-index:1;opacity:0;height:80px;display:flex;align-items:center;padding:0 36px;background:white;border-radius:16px;border:2px solid #DDDDE2;box-shadow:0 4px 12px #0000000D;font-size:40px}#heading span{font-size:26px;color:#5C5C66;margin-right:24px}svg text{fill:#0E0E10}#diagram{position:absolute;left:0;top:170px;width:1920px;height:760px;overflow:hidden}#white{position:absolute;inset:0;z-index:2;background:white;pointer-events:none}
  </style>${Object.values(input.images ?? {})
    .map((img) => `<img hidden src="${escapeHtml(img.url)}">`)
    .join(
      "",
    )}${sameTitle ? "" : `<div id="heading">${heading(input.scene)}</div>`}<svg id="diagram" viewBox="0 170 1920 760"><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.05"/></filter>${["arrow", "arrow-accent"].map((id, i) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9Z" fill="${i ? "#E62F9A" : "#5C5C66"}"/></marker>`).join("")}</defs>${zones}${links}${nodes}<g id="traveler" style="color:white"><circle r="27" fill="#E62F9A"/>${Object.keys(
    VIDEO_ICONS,
  )
    .map((name) => `<g data-icon="${name}">${iconSvg(name as IconName, -18, -18, 36)}</g>`)
    .join(
      "",
    )}</g></svg><div id="caption"></div><div id="white"></div><script>const travelPoint=${travelPoint.toString()};(${runtime.toString()})(${data}, travelPoint, ${sceneTitleOpacity.toString()}, ${sceneCaptionAt.toString()});</script>${tagScript}</html>`;
}
