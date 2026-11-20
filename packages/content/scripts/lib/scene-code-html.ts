import {
  figureNodes,
  sceneRoleLabel,
  type Link,
  type MarkKind,
  type SceneState,
} from "../../src/video-storyboard.js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import { codeFrame, type CodeScene, type CodeSceneState } from "../../src/scene-code.js";
import { sceneCaptionAt, type SceneTimeline } from "../../src/scene-timeline.js";
import {
  iconSvg,
  mark,
  escapeHtml,
  sceneScriptData,
  sceneCaptionCss,
  sceneFontCss,
  type SceneHtmlInput,
  type ScenePageWindow,
} from "./scene-html.js";

hljs.registerLanguage("typescript", typescript);
const require = createRequire(import.meta.url);
const fontFile = require.resolve("@fontsource/jetbrains-mono/400.css");
export const codeFontCss = readFileSync(fontFile, "utf8").replace(
  /url\(\.\/(.+?)\)/g,
  (_, p: string) => `url(${pathToFileURL(join(dirname(fontFile), p)).href})`,
);
export const codeColorsCss = `.hljs-keyword,.hljs-literal{color:#c4a5ff}.hljs-number{color:#ffcd91}.hljs-string,.hljs-template-variable{color:#b5e39c}.hljs-title,.hljs-type{color:#96d4ff}.hljs-comment{color:#a0a0ac}.hljs-built_in,.hljs-params{color:#f4dfa3}`;
export const highlightCode = (code: string) =>
  hljs.highlight(code, { language: "typescript" }).value;
export const codeTextWidth = (line: string) =>
  Array.from(line).reduce((width, c) => width + (/[\x20-\x7e]/u.test(c) ? 0.61 : 1), 0);

interface CodeRenderData {
  scene: CodeScene;
  state: CodeSceneState;
  timing: SceneHtmlInput["timing"];
  highlighted: string[][];
}
function runtime(data: CodeRenderData, frame: typeof codeFrame, captionAt: typeof sceneCaptionAt) {
  const win = window as unknown as ScenePageWindow;
  const element = (id: string) => document.getElementById(id) as HTMLElement;
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const { scene, timing } = data;
  // 打ち込みは読み上げの長さに応じて進むので、文の全区間を撮影対象にする。
  win.__busyRanges = [
    [0, 0.4],
    [timing.duration - 0.4, timing.duration],
    ...timing.beats.map((b): [number, number] => [b.start, b.end + 1 / 30]),
  ];
  win.__setTime = async (time) => {
    const f = frame(scene, data.state, timing, time);
    element("code").innerHTML = f.lines
      .map(
        (line, i) =>
          `<div class="line" style="opacity:${line.dim ? 0.38 : 1}"><span class="source">${data.highlighted[i][Array.from(line.text).length]}</span>${line.mark ? `<b class="mark" style="color:${line.mark === "cross" ? "#e5342b" : "#16a34a"}">${line.mark === "cross" ? "✕" : "○"}</b>` : ""}</div>`,
      )
      .join("");
    if (f.part) {
      const line = element("code").children[f.part.line]?.querySelector(".source");
      const start = f.lines[f.part.line].text.indexOf(f.part.text);
      if (line && start >= 0) {
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        let offset = 0;
        const nodes: { node: Text; start: number }[] = [];
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          nodes.push({ node, start: offset });
          offset += node.length;
        }
        for (const { node, start: at } of nodes) {
          const a = Math.max(0, start - at),
            b = Math.min(node.length, start + f.part.text.length - at);
          if (a >= b) continue;
          const range = document.createRange();
          range.setStart(node, a);
          range.setEnd(node, b);
          const span = document.createElement("span");
          span.className = "part";
          range.surroundContents(span);
          if (at + b === start + f.part.text.length) span.classList.add("numbered");
        }
      }
    }
    const panel = scene.panel;
    const numberLine =
      panel?.kind === "numberLine"
        ? (() => {
            const x = (n: number) => 48 + ((n - panel.from) / (panel.to - panel.from)) * 610;
            const line = f.numberLine;
            const arrow = line?.arrow;
            // 札・矢印・印・数字を別の高さに置き、移動中も互いに重ねない。
            return `<svg class="number-line" viewBox="0 0 706 350" aria-label="数直線">
        <defs><marker id="snap-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#5749db"/></marker></defs>
        ${line?.range ? `<rect class="number-line-range" x="${x(line.range[0])}" y="250" width="${x(line.range[1]) - x(line.range[0])}" height="24" rx="8" fill="#5749db" opacity="0.15"/>` : ""}
        <path d="M 24 262 H 682" stroke="#5c5c66" stroke-width="4"/>
        ${Array.from({ length: panel.to - panel.from + 1 }, (_, i) => {
          const n = panel.from + i,
            mark = line?.ticks[n];
          return `<path d="M ${x(n)} 250 V 274" stroke="#5c5c66" stroke-width="3"/><text class="number-line-number" x="${x(n)}" y="314" text-anchor="middle" font-size="36" font-weight="${arrow?.to === n ? 800 : 500}" fill="${arrow?.to === n ? "#5749db" : "#16161a"}">${n}</text>${mark ? `<text class="number-line-tick" x="${x(n)}" y="234" text-anchor="middle" font-size="40" font-weight="700" fill="${mark === "cross" ? "#e5342b" : "#16a34a"}">${mark === "cross" ? "✕" : "○"}</text>` : ""}`;
        }).join("")}
        ${arrow ? `<path class="number-line-arrow" d="M ${x(arrow.from)} 164 H ${x(arrow.to)}" stroke="#5749db" stroke-width="4" marker-end="url(#snap-arrow)"/><text class="number-line-snap-label" x="${(x(arrow.from) + x(arrow.to)) / 2}" y="130" text-anchor="middle" font-size="26" fill="#5749db">${safe(arrow.label)}</text>` : ""}
        ${line?.point ? `<g opacity="${line.opacity}" transform="translate(${x(line.point.at)} 262)"><circle r="14" fill="#5749db"/><rect class="number-line-point-label-box" x="-56" y="-242" width="112" height="48" rx="8" fill="#eeeafc"/><text class="number-line-point-label" x="0" y="-208" text-anchor="middle" font-size="30" font-weight="700" fill="#5749db">${safe(line.point.label)}</text></g>` : ""}
      </svg>`;
          })()
        : "";
    element("panel").innerHTML =
      numberLine +
      (panel?.kind === "values" || panel?.kind === "numberLine"
        ? (panel.items ?? [])
            .map((name) => {
              const active = f.activeValues.includes(name),
                calc = f.calc?.on === name ? f.calc : undefined;
              const progress = f.valueProgress;
              // 既存値は最初の半分で消え、新しい値は後半で入る。
              const oldValue = Object.hasOwn(f.oldValues, name) ? f.oldValues[name] : undefined;
              const old = active && oldValue !== undefined && progress < 0.5;
              const value = old
                ? oldValue
                : Object.hasOwn(f.values, name)
                  ? f.values[name]
                  : undefined;
              const opacity = active ? (old ? 1 - progress * 2 : Math.max(0, progress * 2 - 1)) : 1;
              return `<div class="value-box ${active ? "active" : ""}"><span class="name">${safe(name)}</span><div class="value-content">${calc ? `<small>${safe(calc.expr)}</small><span class="answer" style="opacity:${f.resultProgress}"><small> → </small><strong>${safe(calc.result)}</strong></span>` : `<strong style="opacity:${opacity};transform:translateY(${active && !old ? (1 - opacity) * 10 : 0}px)">${safe(value ?? "")}</strong>`}</div></div>`;
            })
            .join("")
        : panel?.kind === "calls"
          ? `<div class="calls-heading">呼び出し → 結果</div>${panel.rows.map((row, i) => (f.rows.includes(i) ? `<div class="call-row" style="opacity:${f.newRows.includes(i) ? f.valueProgress : 1}"><code>${safe(row.call)}</code><strong>${safe(row.result)}</strong><small>${safe(row.note ?? "")}</small></div>` : "")).join("")}`
          : "");
    // SVG の文字の実寸で端の札を内側へ寄せる。点と目盛りの位置は動かさない。
    const svg = element("panel").querySelector?.<SVGSVGElement>(".number-line");
    if (svg) {
      const pointX =
        panel?.kind === "numberLine" && f.numberLine?.point
          ? 48 + ((f.numberLine.point.at - panel.from) / (panel.to - panel.from)) * 610
          : 0;
      for (const text of svg.querySelectorAll<SVGTextElement>(
        ".number-line-point-label,.number-line-snap-label,.number-line-tick",
      )) {
        const point = text.classList.contains("number-line-point-label");
        const snap = text.classList.contains("number-line-snap-label");
        const offset = point ? pointX : 0;
        const padding = point ? 12 : 0;
        let bounds = text.getBBox();
        const available = 706 - 16 - padding * 2;
        if (bounds.width > available) {
          text.setAttribute(
            "font-size",
            String((Number(text.getAttribute("font-size")) * available) / bounds.width),
          );
          bounds = text.getBBox();
        }
        const shift = Math.max(
          8 - (bounds.x + offset - padding),
          Math.min(0, 698 - (bounds.x + offset + bounds.width + padding)),
        );
        const anchor = Number(text.getAttribute("x"));
        text.setAttribute("x", String(anchor + shift));
        if (point) {
          const box = svg.querySelector(".number-line-point-label-box");
          box?.setAttribute("x", String(bounds.x + shift - padding));
          box?.setAttribute("width", String(bounds.width + padding * 2));
        }
        if (shift !== 0) {
          const leader = document.createElementNS("http://www.w3.org/2000/svg", "path");
          leader.setAttribute("class", "number-line-label-leader");
          leader.setAttribute(
            "d",
            point
              ? `M ${anchor + shift} -194 L 0 -16`
              : `M ${anchor + shift} ${snap ? 138 : 238} L ${anchor} ${snap ? 160 : 248}`,
          );
          leader.setAttribute("stroke", "#5749db");
          leader.setAttribute("stroke-width", "1");
          leader.setAttribute("fill", "none");
          text.parentNode?.insertBefore(leader, text);
        }
      }
    }
    // フォントを読み込んだブラウザーの実寸で、名前の帯と値の収まりを決める。
    const boxes = [...(element("panel").querySelectorAll?.<HTMLElement>(".value-box") ?? [])];
    const names = boxes.flatMap((box) => {
      const name = box.querySelector<HTMLElement>(".name");
      return name ? [name] : [];
    });
    const nameWidth = Math.max(0, ...names.map((name) => name.getBoundingClientRect().width));
    for (const name of names) name.style.width = `${nameWidth}px`;
    for (const box of boxes) {
      const content = box.querySelector<HTMLElement>(".value-content");
      if (!content) continue;
      const expression = content.querySelector<HTMLElement>(":scope > small");
      const result = content.querySelector<HTMLElement>("strong");
      if (!result) continue;
      const answer = content.querySelector<HTMLElement>(".answer") ?? result;
      const available = content.clientWidth - 32; // 左右の padding
      if (
        expression &&
        expression.getBoundingClientRect().width + answer.getBoundingClientRect().width + 10 >
          available
      ) {
        content.classList.add("stacked");
      }
      for (let size = 38; size > 22 && answer.getBoundingClientRect().width > available; ) {
        size -= 2;
        result.style.fontSize = `${size}px`;
      }
    }
    element("caption").innerHTML = `<span>${safe(captionAt(timing, time))}</span>`;
    const fade = Math.max(0, Math.min(1, time / 0.4));
    element("card").style.opacity = String(fade);
  };
  win.__overflows = () => {
    const messages: string[] = [];
    // Grid/flex の scrollHeight は文字そのものの描画範囲ではない。
    // テキストの行ボックスを、実際に切り取る枠の内側と比較する。
    for (const container of document.querySelectorAll<HTMLElement>(
      "#code,#panel,#heading,#caption,.line,.value-box,.name,.value-content,.call-row",
    )) {
      const box = container.getBoundingClientRect();
      const left = box.left + container.clientLeft;
      const top = box.top + container.clientTop;
      const right = left + container.clientWidth;
      const bottom = top + container.clientHeight;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if (
          [...range.getClientRects()].some(
            (r) =>
              r.width > 0 &&
              r.height > 0 &&
              (r.left < left - 1 ||
                r.right > right + 1 ||
                r.top < top - 1 ||
                r.bottom > bottom + 1),
          )
        ) {
          messages.push(
            `コードの場面で文字がはみ出しています: ${container.id}: ${node.textContent}`,
          );
        }
      }
    }
    return messages;
  };
  win.__setTime(0);
}
const figureCss = `
  #panel:has(.figure-flow){overflow:visible}
  .figure-flow{padding:10px 16px}
  .figure-node{position:relative;display:flex;align-items:center;gap:16px;padding:0 16px;background:white;border:3px solid #DDDDE2;border-radius:16px}
  .figure-art{display:grid;place-items:center;min-width:var(--art-min);height:100%}
  .figure-art img{display:block;width:100%;height:100%;min-width:0;min-height:0;object-fit:contain}
  .figure-label{flex:1;min-width:max-content;font-size:32px;font-weight:700;white-space:nowrap}
  .figure-tag{flex:none;display:flex;align-items:center;height:56px;padding:0 20px;background:#5749DB;color:white;border-radius:16px;font-size:32px;font-weight:700;white-space:pre}
  .figure-mark{position:absolute;right:-7px;top:-9px;width:44px;height:44px}
  .figure-arrow{position:relative;display:grid;place-items:center;overflow:hidden;color:#5C5C66}
  .figure-arrow-label{position:absolute;left:calc(50% + 20px);font-size:26px;white-space:nowrap}
  .figure-traveler{position:absolute;left:50%;width:28px;height:28px;transform:translate(-50%,-50%);border-radius:50%;background:#E62F9A}
`;

interface FigureRenderData {
  nodes: { id: string; label: string; art: string; link?: Link }[];
  marks: Record<MarkKind, string>;
  state: SceneState;
  timing: SceneTimeline;
  motions: { travel?: string[]; pause?: number }[];
  /** schema 2 の入場と強調。無いときは schema 1 の式。 */
  schema?: 2;
}

/** コード描画に重ねて、時刻ごとに図の状態を作る。 */
function figureRuntime({ nodes, marks, state, timing, motions, schema }: FigureRenderData) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const overflows = win.__overflows;
  const panel = document.getElementById("panel") as HTMLElement;
  const height = nodes.length === 2 ? 200 : nodes.length === 3 ? 170 : 132;
  const gap = nodes.length === 4 ? 44 : 48;
  const accent = "#E62F9A";
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
  const own = <T>(entries: Record<string, T> | undefined, id: string) =>
    entries && Object.hasOwn(entries, id) ? entries[id] : undefined;
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  for (const beat of timing.beats)
    win.__busyRanges.push([beat.start, Math.max(beat.start + 0.6, beat.end) + 1 / 30]);
  if (schema === 2)
    for (const [index, beat] of timing.beats.entries())
      if (state.beats[index]?.focus.length) win.__busyRanges.push([beat.end, beat.end + 0.2]);

  const draw = (time: number) => {
    const i = timing.beats.findLastIndex((beat) => beat.start <= time);
    const timed = timing.beats[i];
    const elapsed = timed ? time - timed.start : 0;
    const beat = state.beats[i];
    const before = beat?.before ?? state.start;
    const after = beat?.after ?? state.start;
    const focus = timed && time < timed.end ? beat.focus : [];
    const motion = motions[i];
    const duration = timed ? timed.end - timed.start - (motion?.pause ?? 0) : 0;
    const path = motion?.travel ?? [];
    const travel = duration > 0 && elapsed < duration ? (elapsed / duration) * path.length : -1;
    const traveling = path[Math.floor(travel)];
    // 点はカードの中心から次の中心へ進み、矢印の枠内だけに描く。
    const travelY = (travel % 1) * (height + gap) - height / 2;
    const opacity = (id: string) => {
      const was = before.visible.includes(id);
      const is = after.visible.includes(id);
      const fade = is
        ? was
          ? 1
          : schema === 2
            ? ease(elapsed / 0.5)
            : clamp(elapsed / 0.5)
        : was
          ? 1 - clamp(elapsed / 0.3)
          : 0;
      return fade * (focus.length && !focus.includes(id) ? 0.3 : 1);
    };
    const emphasisAt = (id: string) => {
      if (schema !== 2 || !beat || !timed) return 0;
      const inBefore = (before.emphasis ?? []).includes(id);
      const inAfter = (after.emphasis ?? []).includes(id);
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

    panel.innerHTML = `<div class="figure-flow">${nodes
      .map(({ id, label, art, link }, index) => {
        const was = before.visible.includes(id);
        const is = after.visible.includes(id);
        const pulsing = beat?.pulse.includes(id) && elapsed < 0.6;
        const scale =
          schema === 2
            ? !was && is
              ? 0.94 + 0.06 * ease(elapsed / 0.5)
              : 1
            : pulsing
              ? 1 + 0.045 * Math.sin((elapsed / 0.6) * Math.PI)
              : 1;
        const focused = focus.includes(id);
        const strength = emphasisAt(id);
        const frame =
          schema === 2
            ? `border-width:${3 + strength}px;border-color:${strength === 0 ? "#DDDDE2" : strength === 1 ? accent : `rgba(230,47,154,${strength})`};background:white`
            : `border-color:${pulsing || focused ? accent : "#DDDDE2"};background:${focused ? "rgba(230,47,154,0.08)" : "white"}`;
        const beforeMark = own(before.marks, id);
        const afterMark = own(after.marks, id);
        let shownMark = afterMark;
        let markStyle = "";
        if (schema === 2) {
          if (!beat) {
            shownMark = own(state.start.marks, id);
            markStyle = "opacity:1;transform:scale(1)";
          } else if (afterMark && afterMark !== beforeMark) {
            const entered = ease(elapsed / 0.35);
            markStyle = `opacity:${entered};transform:scale(${0.94 + 0.06 * entered})`;
          } else if (!afterMark && beforeMark) {
            shownMark = beforeMark;
            markStyle = `opacity:${1 - ease(elapsed / 0.3)};transform:scale(1)`;
          } else if (afterMark) markStyle = "opacity:1;transform:scale(1)";
        } else if (afterMark) {
          const markScale = afterMark === beforeMark ? 1 : clamp(elapsed / 0.35);
          markStyle = `transform:scale(${markScale})`;
        }
        const from = own(before.tags, id);
        const to = own(after.tags, id);
        const old = from !== to && from !== undefined && elapsed < (to ? 0.15 : 0.2);
        const value = old ? from : to;
        const progress = clamp((elapsed - (from ? 0.15 : 0)) / 0.35);
        let tagOpacity = 1;
        let tagScale = 1;
        if (from !== to) {
          if (schema === 2) {
            if (old) tagOpacity = 1 - ease(elapsed / (to ? 0.15 : 0.2));
            else {
              const entered = ease((elapsed - (from ? 0.15 : 0)) / 0.35);
              tagOpacity = entered;
              tagScale = 0.94 + 0.06 * entered;
            }
          } else if (old) tagOpacity = 1 - clamp(elapsed / (to ? 0.15 : 0.2));
          else {
            tagOpacity = 1 - (1 - progress) ** 3;
            tagScale = 0.9 + 0.1 * tagOpacity + 0.12 * Math.sin(progress * Math.PI);
          }
        }
        const card = `<div class="figure-node" data-id="${safe(id)}" style="height:${height}px;opacity:${opacity(id)};transform:scale(${scale});${frame}"><div class="figure-art" style="width:${(height * 4) / 3}px;--art-min:${Math.round(height * 0.7)}px">${art}</div><div class="figure-label">${safe(label)}</div>${value === undefined ? "" : `<span class="figure-tag" style="opacity:${tagOpacity};transform:scale(${tagScale})">${safe(value)}</span>`}${shownMark ? `<svg class="figure-mark" data-mark="${shownMark}" style="${markStyle}" viewBox="-30 -30 60 60">${marks[shownMark]}</svg>` : ""}</div>`;
        if (index === nodes.length - 1) return card;
        const highlighted = Boolean(link && beat?.pulse.includes(link.id) && elapsed < 0.6);
        const arrowStroke = schema === 2 ? "#5C5C66" : highlighted ? accent : "#5C5C66";
        const accentPath =
          schema === 2 && link
            ? `<path d="M14 3V${gap - 5}m-9-9 9 9 9-9" stroke="${accent}" stroke-opacity="${emphasisAt(link.id)}"/>`
            : "";
        const arrow = link
          ? `<svg width="28" height="${gap}" viewBox="0 0 28 ${gap}" fill="none" stroke="${arrowStroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3V${gap - 5}m-9-9 9 9 9-9"/>${accentPath}</svg>${link.label ? `<span class="figure-arrow-label">${safe(link.label)}</span>` : ""}${traveling === link.id && travelY > -14 && travelY < gap + 14 ? `<span class="figure-traveler" style="top:${travelY}px"></span>` : ""}`
          : "";
        return `${card}<div class="figure-arrow" style="height:${gap}px;opacity:${link ? opacity(link.id) : 0}">${arrow}</div>`;
      })
      .join("")}</div>`;
  };
  win.__setTime = async (time) => {
    await setTime(time);
    draw(time);
  };
  win.__overflows = () => {
    const messages = overflows();
    for (const card of panel.querySelectorAll<HTMLElement>(".figure-node")) {
      if (card.style.opacity === "0") continue;
      const bounds = card.getBoundingClientRect();
      const scale = bounds.height / card.offsetHeight;
      const border = card.clientTop * scale;
      for (const content of card.querySelectorAll<HTMLElement>(".figure-label,.figure-tag")) {
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          if (
            [...range.getClientRects()].some(
              (rect) =>
                rect.width > 0 &&
                rect.height > 0 &&
                (rect.left < bounds.left + border - 1 ||
                  rect.right > bounds.right - border + 1 ||
                  rect.top < bounds.top + border - 1 ||
                  rect.bottom > bounds.bottom - border + 1),
            )
          ) {
            const label = card.querySelector<HTMLElement>(".figure-label");
            const part = content.classList.contains("figure-tag") ? "札" : "ラベル";
            messages.push(`図のカード「${label?.textContent}」の${part}が収まりません`);
            break;
          }
        }
      }
    }
    return messages;
  };
  draw(0);
}
function codeCutRuntime() {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const card = document.getElementById("card") as HTMLElement;
  const background = document.getElementById("code-opening");
  if (!background) win.__busyRanges.shift();
  const draw = (time: number) => {
    card.style.opacity = "1";
    if (background)
      background.style.opacity = String((1 - Math.max(0, Math.min(1, time / 0.4))) ** 3);
  };
  win.__setTime = (time) => {
    const pending = setTime(time);
    draw(time);
    return pending;
  };
  draw(0);
}

function partNoteRuntime(notes: { start: number; html?: string }[], lesson?: boolean) {
  const win = window as unknown as ScenePageWindow;
  const setTime = win.__setTime;
  const code = document.getElementById("code") as HTMLElement;
  const fade = 0.3;
  for (const note of notes) if (note.html) win.__busyRanges.push([note.start, note.start + fade]);
  win.__setTime = async (time) => {
    await setTime(time);
    const note = notes.findLast(({ start }) => time >= start);
    if (!note?.html) return;
    const last = code.querySelector(".part.numbered");
    const first = code.querySelector(".part");
    if (!first || !last) return;
    last.classList.remove("numbered");
    const a = first.getBoundingClientRect();
    const b = last.getBoundingClientRect();
    const bounds = code.getBoundingClientRect();
    const center = (a.left + b.right) / 2 - bounds.left;
    const bubble = document.createElement("div");
    bubble.className = "part-note";
    bubble.innerHTML = note.html;
    code.append(bubble);
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const left = Math.max(8, Math.min(code.clientWidth - width - 8, center - width / 2));
    const line = first.closest(".line");
    const next = line?.nextElementSibling?.querySelector(".source");
    const above = Boolean(next?.textContent?.trim()) && a.top - bounds.top >= height + 17;
    const top = above ? a.top - bounds.top - height - 10 : b.bottom - bounds.top + 10;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${Math.max(7, Math.min(code.clientHeight - height - 7, top))}px`;
    bubble.style.setProperty("--pointer", `${Math.max(10, Math.min(width - 10, center - left))}px`);
    bubble.classList.toggle("below", !above);
    const progress = Math.max(0, Math.min(1, (time - note.start) / fade));
    bubble.style.opacity = String(1 - (1 - progress) ** 3);
    bubble.style.transform = lesson
      ? `scale(${0.94 + 0.06 * (1 - (1 - progress) ** 3)})`
      : `translateY(${(above ? 3 : -3) * (1 - progress)}px)`;
    if (lesson) bubble.style.transformOrigin = "center";
  };
}

function withCodeOverlays(html: string, input: SceneHtmlInput, scene: CodeScene): string {
  if (input.schema === 2) {
    if (input.fadeFromBackground)
      html = html.replace(
        "<script>",
        '<div id="code-opening" style="position:absolute;inset:0;background:#F7F7F9;z-index:2;pointer-events:none"></div><script>',
      );
    html = html.replace("</html>", `<script>(${codeCutRuntime.toString()})();</script></html>`);
  }
  if (!scene.beats.some((beat) => beat.part?.note)) return html;
  const notes = scene.beats.map(({ part }, index) => ({
    start: input.timing.beats[index].start,
    html: part?.note ? escapeHtml(part.note) : undefined,
  }));
  return html
    .replace(
      "</style>",
      `
      .part-note{position:absolute;z-index:1;width:max-content;max-width:calc(100% - 16px);padding:5px 12px;background:#EEEAFC;color:#5749DB;border-radius:9px;font:700 30px/1.2 'Noto Sans JP',sans-serif;white-space:nowrap;pointer-events:none}
      .part-note:after{content:'';position:absolute;left:var(--pointer);top:100%;transform:translateX(-50%);border:7px solid transparent;border-bottom:0;border-top-color:#EEEAFC}
      .part-note.below:after{top:auto;bottom:100%;border-top:0;border-bottom:7px solid #EEEAFC}
    </style>`,
    )
    .replace(
      "</html>",
      () =>
        `<script>(${partNoteRuntime.toString()})(${sceneScriptData(notes)}${input.schema === 2 ? ",true" : ""});</script></html>`,
    );
}

export function codeHtml(input: SceneHtmlInput): string {
  const scene = input.scene as CodeScene;
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const { figure, ...state } = input.state as CodeSceneState;
  const figureData: FigureRenderData | undefined = figure && {
    nodes: figureNodes(input.board).map((node) => ({
      id: node.id,
      label: node.label,
      art: node.art
        ? `<img src="${safe(input.images?.[`art:${node.art}`]?.url ?? "")}" alt="">`
        : iconSvg(node.icon ?? "file", 0, 0, 84),
      link: input.board.links?.find((link) => link.from === node.id),
    })),
    marks: {
      check: mark("check"),
      cross: mark("cross"),
      question: mark("question"),
      redo: mark("redo"),
    },
    state: figure,
    timing: input.timing,
    motions: scene.beats.map((beat, index) => {
      const timed = input.timing.beats[index];
      return {
        travel: beat.figure?.travel?.along,
        pause: beat.term || beat.dialog ? timed.end - (timed.speechEnd ?? timed.end) : beat.pause,
      };
    }),
    ...(input.schema === 2 ? { schema: 2 as const } : {}),
  };
  const codeWidth = scene.panel ? 1010 : 1752;
  const widest = Math.max(1, ...scene.code.map(codeTextWidth));
  const fontSize = Math.min(
    scene.code.length <= 6 ? 36 : 30,
    Math.floor((codeWidth - 90) / widest),
  );
  const contentHeight = 682;
  // 最後の行やその手前にも、下に出す吹き出しと三角のぶんの空間を確保する。
  const noteLineCount = Math.max(
    0,
    ...scene.beats.map(({ part }) => (part?.note ? part.line + 1 : 0)),
  );
  const notePadding = 104; // 上の28pxと、吹き出しを下に置く76px。
  const lineHeight = Math.min(
    Math.ceil(fontSize * 1.5),
    Math.floor((contentHeight - 56) / scene.code.length),
    noteLineCount ? Math.floor((contentHeight - notePadding) / noteLineCount) : Infinity,
  );
  const codeHeight = Math.max(
    Math.ceil(810 * 0.45),
    scene.code.length * lineHeight + 56,
    noteLineCount ? noteLineCount * lineHeight + notePadding : 0,
  );
  const data: CodeRenderData = {
    scene,
    state,
    timing: input.timing,
    highlighted: scene.code.map((line) =>
      Array.from({ length: Array.from(line).length + 1 }, (_, n) =>
        highlightCode(Array.from(line).slice(0, n).join("")),
      ),
    ),
  };
  const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}${codeFontCss}${sceneCaptionCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f7f7f9;color:#16161a;font:500 30px 'Noto Sans JP',sans-serif}
  #card{position:absolute;left:60px;top:140px;width:1800px;height:810px;padding:24px;background:white;border-radius:20px;box-shadow:0 5px 18px #00000012;display:flex;flex-direction:column;gap:24px}
  #heading{height:56px;flex-shrink:0;display:flex;align-items:center;gap:20px;overflow:hidden;white-space:nowrap}#heading span{padding:8px 16px;border-radius:8px;background:#0e0e10;color:#fff;font-size:24px}#heading h2{margin:0;font-size:28px;font-weight:700}
  #content{display:flex;align-items:center;gap:36px;flex:1;min-height:0}
  #code{position:relative;width:${codeWidth}px;flex-shrink:0;height:${codeHeight}px;padding:28px 24px;background:#16161a;border-radius:12px;color:#f4f4f6;font:400 ${fontSize}px/${lineHeight}px 'JetBrains Mono',ui-monospace,monospace;overflow:hidden}
  .line{height:${lineHeight}px;position:relative;white-space:pre;padding-right:38px}.source{white-space:pre}.mark{position:absolute;right:0;top:0;font:700 34px/${lineHeight}px sans-serif}.part{border-bottom:3px solid #b6a9ff}.numbered{position:relative}.numbered:after{content:'1';position:absolute;right:-10px;top:-16px;width:20px;height:20px;border-radius:50%;background:#5749db;color:white;text-align:center;font:500 14px/20px sans-serif}
  ${codeColorsCss}
  #panel{flex:1;min-width:0;max-height:100%;display:flex;flex-direction:column;gap:16px;justify-content:center;overflow:hidden}
  .number-line{width:100%;height:auto;flex-shrink:0;overflow:hidden;margin-bottom:32px}
  .value-box{display:flex;min-height:76px;border:3px solid #dddde2;border-radius:12px;overflow:hidden;flex-shrink:0}.value-box.active{border-color:#5749db}.name{display:flex;align-items:center;flex-shrink:0;padding:12px 16px;background:#eeeef2;font:400 28px 'JetBrains Mono',ui-monospace,monospace;white-space:nowrap}.value-content{flex:1;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 16px}.value-content.stacked{flex-direction:column;align-items:flex-end;gap:4px}.value-content strong{display:inline-block;font-size:38px;white-space:nowrap;flex-shrink:0}.value-content small{font-size:22px;white-space:nowrap;flex-shrink:0}.answer{display:flex;align-items:center;flex-shrink:0}.calls-heading{font-size:28px;color:#5c5c66}.call-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:18px 12px;border-bottom:2px solid #dddde2;flex-shrink:0}.call-row code{font:400 28px 'JetBrains Mono',ui-monospace,monospace}.call-row strong{font-size:34px}.call-row small{grid-column:1/-1;text-align:right;font-size:22px;color:#5c5c66}
  #code,#code *,#panel,#panel *{font-variant-ligatures: none;font-feature-settings: "liga" 0, "calt" 0}
  ${figureData ? figureCss : ""}</style><div id="card"><div id="heading"><span>${sceneRoleLabel(scene)}</span><h2>${safe(scene.title)}</h2></div><div id="content"><div id="code"></div><div id="panel" ${scene.panel ? "" : 'style="display:none"'}></div></div></div><div id="caption"></div><script>(${runtime.toString()})(${JSON.stringify(data).replace(/</g, "\\u003c")},${codeFrame.toString()},${sceneCaptionAt.toString()});${figureData ? `(${figureRuntime.toString()})(${JSON.stringify(figureData).replace(/</g, "\\u003c")});` : ""}</script></html>`;
  return withCodeOverlays(html, input, scene);
}
