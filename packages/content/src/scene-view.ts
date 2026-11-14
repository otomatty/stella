import type { Box } from "./scene-layout.js";
import type { SceneTimeline } from "./scene-timeline.js";
import type { ViewSceneState, ViewState } from "./video-storyboard.js";
import type { ShotRegion } from "./video-shots.js";

export const SHOT_GROUPS: Record<string, { label: string; color: string }> = {
  web: { label: "Web", color: "#2563EB" },
  vscode: { label: "VS Code", color: "#8330C7" },
};
export interface ViewImage {
  url: string;
  width: number;
  height: number;
  /** 画像ピクセル。art の割合も読み込み時に変換する。 */
  regions: Record<string, ShotRegion>;
}
export interface ViewFrameInput {
  state: ViewSceneState;
  timing: SceneTimeline;
  images: Record<string, ViewImage>;
  previous?: ViewState;
}
/** DOM や時計に依存しないカメラ・クロスフェード・カーソルの計算。 */
export function viewFrame(input: ViewFrameInput, time: number) {
  const { state, timing, images } = input;
  const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const smooth = (n: number) => {
    const t = clamp(n);
    return t * t * (3 - 2 * t);
  };
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const base = (image: string): Box => {
    const img = images[image];
    const top = image.startsWith("shot:") ? 170 : 130;
    const height = 950 - top;
    const s = Math.min(1800 / img.width, height / img.height);
    const w = img.width * s,
      h = img.height * s;
    return { x: (1920 - w) / 2, y: top + (height - h) / 2, w, h };
  };
  const region = (image: string, name: string): Box => {
    const img = images[image],
      b = base(image),
      r = img.regions[name];
    return {
      x: b.x + (r[0] * b.w) / img.width,
      y: b.y + (r[1] * b.h) / img.height,
      w: (r[2] * b.w) / img.width,
      h: (r[3] * b.h) / img.height,
    };
  };
  const camera = (s: ViewState) => {
    const b = base(s.image);
    if (s.zoom === "all") return { scale: 1, x: 0, y: 0 };
    const r = region(s.image, s.zoom);
    // 元画像の24pxを表示座標へ換算し、両辺が収まる倍率に15%の余裕を持たせる。
    const padding = (24 * b.w) / images[s.image].width;
    const scale = clamp(
      0.85 * Math.min(b.w / (r.w + 2 * padding), b.h / (r.h + 2 * padding)),
      1,
      2.4,
    );
    return {
      scale,
      x: clamp(
        b.x + b.w / 2 - (r.x + r.w / 2) * scale,
        (b.x + b.w) * (1 - scale),
        b.x * (1 - scale),
      ),
      y: clamp(
        b.y + b.h / 2 - (r.y + r.h / 2) * scale,
        (b.y + b.h) * (1 - scale),
        b.y * (1 - scale),
      ),
    };
  };
  let k = -1;
  for (let i = 0; i < timing.beats.length; i++) if (time >= timing.beats[i].start) k = i;
  let current = state.start,
    cam = camera(current),
    prior = input.previous;
  let fadeStart = 0;
  for (let i = 0; i <= k; i++) {
    const next = state.beats[i].after;
    const changed = next.image !== current.image;
    if (changed) {
      prior = current;
      fadeStart = timing.beats[i].start;
      cam = camera({ ...next, zoom: "all" });
    }
    const target = camera(next),
      t = smooth((time - timing.beats[i].start) / 0.8);
    cam = {
      scale: mix(cam.scale, target.scale, t),
      x: mix(cam.x, target.x, t),
      y: mix(cam.y, target.y, t),
    };
    current = next;
  }
  const b = base(current.image);
  const project = (r: Box): Box => ({
    x: r.x * cam.scale + cam.x,
    y: r.y * cam.scale + cam.y,
    w: r.w * cam.scale,
    h: r.h * cam.scale,
  });
  const at = (name: string) => project(region(current.image, name));
  const active = k >= 0 && time < timing.beats[k].end;
  const elapsed = k < 0 ? 0 : time - timing.beats[k].start;
  const opacity = clamp(elapsed / 0.3);
  const spots = active
    ? current.spot.map((name) => {
        const r = at(name);
        return { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 };
      })
    : [];
  const labels = active
    ? current.label.map((l) => {
        const r = at(l.at),
          w = Array.from(l.text).length * 35 + 32,
          h = 60;
        const above = r.y - h - 16 >= b.y;
        return {
          text: l.text,
          x: clamp(r.x + r.w / 2 - w / 2, b.x, b.x + b.w - w),
          y: clamp(above ? r.y - h - 16 : r.y + r.h + 16, b.y, b.y + b.h - h),
          w,
          h,
          above,
          target: { x: r.x + r.w / 2, y: above ? r.y : r.y + r.h },
        };
      })
    : [];
  let cursor: { x: number; y: number; ripple: number } | undefined;
  if (active && current.click) {
    const r = at(current.click),
      target = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const prev = k > 0 ? state.beats[k - 1].after : undefined;
    const prevRect = prev?.click && prev.image === current.image ? at(prev.click) : undefined;
    const from = prevRect
      ? { x: prevRect.x + prevRect.w / 2, y: prevRect.y + prevRect.h / 2 }
      : { x: b.x + b.w - 48, y: b.y + b.h - 48 };
    const t = smooth(elapsed / 0.7);
    cursor = {
      x: mix(from.x, target.x, t),
      y: mix(from.y, target.y, t),
      ripple: elapsed >= 0.7 && elapsed < 1.2 ? (elapsed - 0.7) / 0.5 : -1,
    };
  }
  const old =
    prior && prior.image !== current.image
      ? { image: prior.image, box: base(prior.image), camera: camera(prior) }
      : undefined;
  const fade = old ? clamp((time - fadeStart) / 0.4) : 1;
  return { image: current.image, box: b, camera: cam, old, fade, spots, labels, opacity, cursor };
}
export function viewBusyRanges(timing: SceneTimeline): [number, number][] {
  return [
    [0, 0.4],
    ...timing.beats.flatMap((b): [number, number][] => [
      [b.start, b.start + 1.2],
      [b.end, b.end + 0.01],
    ]),
  ];
}
