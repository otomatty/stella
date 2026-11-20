import { sceneCaptionAt, sceneTitleOpacity, viewTransition } from "../../src/scene-timeline.js";
import {
  viewBusyRanges,
  viewFrame,
  SHOT_GROUPS,
  type ViewFrameInput,
} from "../../src/scene-view.js";
import type { ViewSceneState } from "../../src/video-storyboard.js";
import {
  sceneCaptionCss,
  sceneFontCss,
  type SceneHtmlInput,
  type ScenePageWindow,
} from "./scene-html.js";

function runtime(
  data: ViewFrameInput & { index: number; fadeFromBackground?: boolean },
  frame: typeof viewFrame,
  busy: typeof viewBusyRanges,
  groups: typeof SHOT_GROUPS,
  transition: typeof viewTransition,
  titleOpacity: typeof sceneTitleOpacity,
  captionAt: typeof sceneCaptionAt,
) {
  const win = window as unknown as ScenePageWindow;
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const element = (id: string) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`描画領域がありません: ${id}`);
    return el;
  };
  const surface = element("surface");
  let overflows: string[] = [];
  win.__busyRanges = busy(data.timing);
  win.__setTime = async (time) => {
    const f = frame(data, time, transition, groups),
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
      const shot = !id.startsWith("art:");
      const group = shot ? id.slice(5).split("/")[0] : undefined;
      const chromeHeight = groups[group ?? ""]?.chromeHeight ?? 0;
      const top = box.y - chromeHeight,
        height = box.h + chromeHeight;
      const radius = shot ? 8 : 16;
      const clip = `clip-${id.replace(/[^a-z0-9-]/g, "-")}`;
      const captionButtons = (
        x: number,
        y: number,
        width: number,
        height: number,
        color: string,
      ) => {
        const buttonWidth = width / 3,
          size = (10 * buttonWidth) / 46;
        const icons = [
          `<path d="M0 ${size / 2}H${size}"/>`,
          `<rect width="${size}" height="${size}"/>`,
          `<path d="M0 0L${size} ${size}M${size} 0L0 ${size}"/>`,
        ];
        return `<g data-caption-buttons="${group}" fill="none" stroke="${color}" stroke-width="${buttonWidth / 46}">${icons.map((icon, i) => `<g transform="translate(${x + buttonWidth * (i + 0.5) - size / 2} ${y + (height - size) / 2})">${icon}</g>`).join("")}</g>`;
      };
      const img = data.images[id];
      const tab = safe(img?.browser?.tab ?? "STELLA");
      const address = safe(img?.browser?.address ?? "stella.saedgewell.workers.dev");
      const browserChrome =
        group === "web"
          ? `<g data-browser-chrome="true" transform="translate(${box.x} ${top})">
        <rect width="${box.w}" height="80" fill="white"/>
        <rect width="${box.w}" height="40" fill="#E8EAED"/>
        <path d="M8 40V14Q8 6 16 6H248Q256 6 256 14V40" fill="white"/>
        <text x="24" y="28" font-size="16" fill="#303036">${tab}</text>
        <path d="M234 18L242 26M242 18L234 26" fill="none" stroke="#5C5C66" stroke-width="1"/>
        ${captionButtons(box.w - 138, 0, 138, 40, "#303036")}
        <g transform="translate(22 60)" fill="none" stroke="#5C5C66" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 -6L0 0L6 6M0 0H14"/>
          <path d="M44 -6L50 0L44 6M36 0H50"/>
          <path d="M88 -4A7 7 0 1 0 88 4M88 -10V-4H82"/>
        </g>
        <rect x="128" y="46" width="${box.w - 144}" height="28" rx="14" fill="#F1F3F4"/>
        <text x="144" y="65" font-size="15" fill="#5C5C66">${address}</text>
        <path d="M0 79.5H${box.w}" stroke="#C8C8CE" stroke-width="1"/>
      </g>`
          : "";
      // 画像のピクセル座標で置き、画像と同じカメラで動かす。
      const vscodeChrome =
        group === "vscode"
          ? `<g transform="translate(${box.x} ${box.y}) scale(${box.w / img.width})">${captionButtons(img.width - 172, 0, 172, 44, "#CCCCCC")}</g>`
          : "";
      return `<g opacity="${opacity}" ${shot || shadow ? 'style="filter:drop-shadow(0px 10px 18px #00000028)"' : ""} transform="translate(${960 + motion.x} 540) scale(${motion.scale}) translate(-960 -540)">
        <defs><clipPath id="${clip}-window"><rect x="${box.x}" y="${top}" width="${box.w}" height="${height}" rx="${radius}"/></clipPath><clipPath id="${clip}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/></clipPath></defs>
        <rect x="${box.x}" y="${top}" width="${box.w}" height="${height}" rx="${radius}" fill="white" ${shot ? "" : 'style="filter:drop-shadow(0px 5px 10px #00000012)"'}/>
        <g clip-path="url(#${clip}-window)">
          <g clip-path="url(#${clip})"><g data-camera="true" transform="translate(${cam.x} ${cam.y}) scale(${cam.scale})"><foreignObject x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"><img src="${safe(url)}" style="display:block;width:100%;height:100%"/></foreignObject>${vscodeChrome}</g></g>
          ${browserChrome}
          ${dim ? `<rect x="${box.x}" y="${top}" width="${box.w}" height="${height}" fill="rgba(14,14,16,0.25)" opacity="${dim}"/>` : ""}
        </g>
        ${shot ? `<rect data-window-border="true" x="${box.x + 0.5}" y="${top + 0.5}" width="${box.w - 1}" height="${height - 1}" rx="7.5" fill="none" stroke="#C8C8CE" stroke-width="1"/>` : ""}
      </g>`;
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
    const title = document.getElementById("heading");
    if (title) title.style.opacity = String(titleOpacity(time));
    element("white").style.background = data.fadeFromBackground ? "#F7F7F9" : "white";
    element("white").style.opacity = String(
      data.index === 0 || data.fadeFromBackground ? 1 - fade : 0,
    );
    overflows = [];
    const caption = element("caption");
    const say = captionAt(data.timing, time);
    caption.innerHTML = `<span>${safe(say)}</span>`;
    if ((caption.firstElementChild as HTMLElement).scrollHeight > 90)
      overflows.push(`字幕が2行に収まりません: ${say}`);
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
      ? `<span>${scene.role === "point" ? `要点 ${scene.point}` : scene.role === "recap" ? "問題へ" : ""}</span> ${safe(scene.title)}`
      : "";
  const sameTitle =
    input.previous?.role === input.scene.role &&
    input.previous?.point === input.scene.point &&
    input.previous?.title === input.scene.title;
  const data = JSON.stringify({
    state: input.state as ViewSceneState,
    timing: input.timing,
    images: input.images,
    previous: input.previousView?.end,
    index: input.index,
    fadeFromBackground: input.fadeFromBackground,
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}${sceneCaptionCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#F7F7F9;color:#0E0E10;font-family:'Noto Sans JP',sans-serif;font-weight:500}#heading{position:absolute;top:24px;left:50%;transform:translateX(-50%);white-space:nowrap;z-index:1;opacity:0;height:80px;display:flex;align-items:center;padding:0 36px;background:white;border-radius:16px;border:2px solid #DDDDE2;box-shadow:0 4px 12px #0000000D;font-size:40px}#heading span{font-size:26px;color:#5C5C66;margin-right:24px}#surface{position:absolute;inset:0;width:1920px;height:1080px;pointer-events:none}#white{position:absolute;inset:0;z-index:2;background:white;pointer-events:none}
  </style>${Object.values(input.images ?? {})
    .map((img) => `<img hidden src="${safe(img.url)}">`)
    .join(
      "",
    )}${sameTitle ? "" : `<div id="heading">${heading(input.scene)}</div>`}<svg id="surface" viewBox="0 0 1920 1080"></svg><div id="caption"></div><div id="white"></div><script>(${runtime.toString()})(${data}, ${viewFrame.toString()}, ${viewBusyRanges.toString()}, ${JSON.stringify(SHOT_GROUPS)}, ${viewTransition.toString()}, ${sceneTitleOpacity.toString()}, ${sceneCaptionAt.toString()});</script></html>`;
}
