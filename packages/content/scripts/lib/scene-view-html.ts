import { viewTransition } from "../../src/scene-timeline.js";
import {
  viewBusyRanges,
  viewFrame,
  SHOT_GROUPS,
  type ViewFrameInput,
} from "../../src/scene-view.js";
import type { ViewSceneState } from "../../src/video-storyboard.js";
import { sceneFontCss, type SceneHtmlInput, type ScenePageWindow } from "./scene-html.js";

function runtime(
  data: ViewFrameInput & { index: number },
  frame: typeof viewFrame,
  busy: typeof viewBusyRanges,
  groups: typeof SHOT_GROUPS,
  transition: typeof viewTransition,
) {
  const win = window as unknown as ScenePageWindow;
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const element = (id: string) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`描画領域がありません: ${id}`);
    return el;
  };
  const surface = element("surface");
  let overflows: string[] = [];
  win.__busyRanges = busy(data.timing);
  win.__setTime = async (time) => {
    const f = frame(data, time, transition),
      b = f.box;
    const imageLayer = (
      id: string,
      url: string,
      box: typeof b,
      cam: typeof f.camera,
      opacity: number,
      motion: typeof f.motion,
      dim = 0,
      shadow = false,
    ) => {
      const group = !id.startsWith("art:") ? groups[id.slice(5).split("/")[0]] : undefined;
      const shot = !id.startsWith("art:");
      const clip = `clip-${id.replace(/[^a-z0-9-]/g, "-")}`;
      return `<g opacity="${opacity}" ${shadow ? 'style="filter:drop-shadow(0px 12px 24px #00000020)"' : ""} transform="translate(${960 + motion.x} 540) scale(${motion.scale}) translate(-960 -540)"><defs><clipPath id="${clip}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="16"/></clipPath></defs><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="16" fill="white" style="filter:drop-shadow(0px 5px 10px #00000012)"/><g clip-path="url(#${clip})"><foreignObject x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" transform="translate(${cam.x} ${cam.y}) scale(${cam.scale})"><img src="${safe(url)}" style="display:block;width:100%;height:100%"/></foreignObject></g>${shot ? `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="16" fill="none" stroke="${group?.color ?? "#DDDDE2"}" stroke-width="3"/>` : ""}${dim ? `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="16" fill="rgba(14,14,16,0.25)" opacity="${dim}"/>` : ""}${group ? `<rect x="${box.x}" y="${box.y - 42}" width="${group.label.length * 25 + 32}" height="42" rx="8" fill="${group.color}"/><text x="${box.x + 16}" y="${box.y - 9}" font-size="28" fill="white">${group.label}</text>` : ""}</g>`;
    };
    const rect = (r: typeof b, extra: string) =>
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10" ${extra}/>`;
    const spots = f.spots.length
      ? `<defs><mask id="spot-mask">${rect(b, 'fill="white"')}${f.spots.map((r) => rect(r, 'fill="black"')).join("")}</mask></defs><g opacity="${f.opacity}" clip-path="url(#overlay-clip)">${rect(b, 'fill="rgba(14,14,16,0.4)" mask="url(#spot-mask)"')}${f.spots.map((r) => rect(r, 'fill="none" stroke="#E62F9A" stroke-width="4"')).join("")}</g>`
      : "";
    const labels = f.labels
      .map(
        (l) =>
          `<g opacity="${f.opacity}">${rect(l, 'fill="white" stroke="#E62F9A" stroke-width="3"')}<path d="M${l.target.x - 10} ${l.above ? l.y + l.h : l.y}L${l.target.x} ${l.above ? l.y + l.h + 12 : l.y - 12}L${l.target.x + 10} ${l.above ? l.y + l.h : l.y}" fill="white" stroke="#E62F9A" stroke-width="3"/><text x="${l.x + 16}" y="${l.y + 43}" font-size="35" fill="#0E0E10">${safe(l.text)}</text></g>`,
      )
      .join("");
    const c = f.cursor;
    const cursor = c
      ? `<g transform="translate(${c.x} ${c.y})">${c.ripple >= 0 ? `<circle r="${8 + c.ripple * 45}" fill="none" stroke="#E62F9A" stroke-width="4" opacity="${1 - c.ripple}"/>` : ""}<path d="M0 0L3 40L14 29L23 44L31 40L22 25L38 24Z" fill="#0E0E10" stroke="white" stroke-width="3" stroke-linejoin="round"/></g>`
      : "";
    surface.innerHTML = `${f.old && f.fade < 1 ? imageLayer(f.old.image, f.old.url, f.old.box, f.old.camera, f.oldOpacity, f.oldMotion, f.oldDim) : ""}${imageLayer(f.image, f.url, b, f.camera, f.incomingOpacity, f.motion, 0, f.switching)}<defs><clipPath id="overlay-clip">${rect(b, "")}</clipPath></defs>${spots}${labels}${cursor}`;
    const fade = Math.max(0, Math.min(1, time / 0.4));
    element("heading").style.opacity = String(fade);
    element("previous-heading").style.opacity = String(1 - fade);
    element("white").style.opacity = String(data.index === 0 ? 1 - fade : 0);
    overflows = [];
    for (const [i, l] of f.labels.entries()) {
      if (l.x < b.x || l.y < b.y || l.x + l.w > b.x + b.w || l.y + l.h > b.y + b.h)
        overflows.push(`札が画像からはみ出しています: ${l.text}`);
      for (const other of f.labels.slice(0, i))
        if (
          l.x < other.x + other.w &&
          other.x < l.x + l.w &&
          l.y < other.y + other.h &&
          other.y < l.y + l.h
        )
          overflows.push(`札が重なっています: ${other.text} / ${l.text}`);
    }
    if (surface.querySelectorAll) {
      await Promise.all([...surface.querySelectorAll("img")].map((img) => img.decode()));
      surface.getBoundingClientRect();
    }
  };
  win.__overflows = () => [...overflows];
  win.__setTime(0);
}
export function viewHtml(input: SceneHtmlInput): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const heading = (scene: typeof input.scene | undefined) =>
    scene
      ? `<span>${scene.role === "point" ? `要点 ${scene.point}` : scene.role === "recap" ? "まとめ" : ""}</span> ${safe(scene.title)}`
      : "";
  const data = JSON.stringify({
    state: input.state as ViewSceneState,
    timing: input.timing,
    images: input.images,
    previous: input.previousView?.end,
    index: input.index,
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#F7F7F9;color:#0E0E10;font-family:'Noto Sans JP',sans-serif;font-weight:500}header{height:130px;background:white;border-bottom:2px solid #DDDDE2;display:flex;align-items:center;padding:0 72px;font-size:48px}header span{font-size:30px;color:#5C5C66;margin-right:24px}#heading,#previous-heading{position:absolute;left:72px;top:30px;height:72px;white-space:nowrap}.dots{margin-left:auto;display:flex;gap:18px}.dot{width:16px;height:16px;border-radius:50%;background:#DDDDE2}.dot.active{background:#E62F9A}#surface{position:absolute;inset:0;width:1920px;height:1080px;pointer-events:none}#white{position:absolute;inset:0;background:white;pointer-events:none}
  </style>${Object.values(input.images ?? {})
    .map((img) => `<img hidden src="${safe(img.url)}">`)
    .join(
      "",
    )}<header><div id="previous-heading">${heading(input.previous)}</div><div id="heading">${heading(input.scene)}</div><div class="dots">${Array.from({ length: input.total }, (_, i) => `<i class="dot ${i === input.index ? "active" : ""}"></i>`).join("")}</div></header><svg id="surface" viewBox="0 0 1920 1080"></svg><div id="white"></div><script>(${runtime.toString()})(${data}, ${viewFrame.toString()}, ${viewBusyRanges.toString()}, ${JSON.stringify(SHOT_GROUPS)}, ${viewTransition.toString()});</script></html>`;
}
