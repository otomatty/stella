import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import { codeFrame, type CodeScene, type CodeSceneState } from "../../src/scene-code.js";
import { sceneCaptionAt } from "../../src/scene-timeline.js";
import {
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
    element("panel").innerHTML =
      panel?.kind === "values"
        ? panel.items
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
          : "";
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
export function codeHtml(input: SceneHtmlInput): string {
  const scene = input.scene as CodeScene;
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const codeWidth = scene.panel ? 1010 : 1752;
  const widest = Math.max(
    1,
    ...scene.code.map((line) =>
      Array.from(line).reduce((width, c) => width + (/[\x20-\x7e]/u.test(c) ? 0.61 : 1), 0),
    ),
  );
  const fontSize = Math.min(
    scene.code.length <= 6 ? 36 : 30,
    Math.floor((codeWidth - 90) / widest),
  );
  const contentHeight = 682;
  const lineHeight = Math.min(
    Math.ceil(fontSize * 1.5),
    Math.floor((contentHeight - 56) / scene.code.length),
  );
  const codeHeight = Math.max(Math.ceil(810 * 0.45), scene.code.length * lineHeight + 56);
  const data: CodeRenderData = {
    scene,
    state: input.state as CodeSceneState,
    timing: input.timing,
    highlighted: scene.code.map((line) =>
      Array.from(
        { length: Array.from(line).length + 1 },
        (_, n) =>
          hljs.highlight(Array.from(line).slice(0, n).join(""), { language: "typescript" }).value,
      ),
    ),
  };
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><style>${sceneFontCss}${codeFontCss}${sceneCaptionCss}
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f7f7f9;color:#16161a;font:500 30px 'Noto Sans JP',sans-serif}
  #card{position:absolute;left:60px;top:140px;width:1800px;height:810px;padding:24px;background:white;border-radius:20px;box-shadow:0 5px 18px #00000012;display:flex;flex-direction:column;gap:24px}
  #heading{height:56px;flex-shrink:0;display:flex;align-items:center;gap:20px;overflow:hidden;white-space:nowrap}#heading span{padding:8px 16px;border-radius:8px;background:#0e0e10;color:#fff;font-size:24px}#heading h2{margin:0;font-size:28px;font-weight:700}
  #content{display:flex;align-items:center;gap:36px;flex:1;min-height:0}
  #code{position:relative;width:${codeWidth}px;flex-shrink:0;height:${codeHeight}px;padding:28px 24px;background:#16161a;border-radius:12px;color:#f4f4f6;font:400 ${fontSize}px/${lineHeight}px 'JetBrains Mono',ui-monospace,monospace;overflow:hidden}
  .line{height:${lineHeight}px;position:relative;white-space:pre;padding-right:38px}.source{white-space:pre}.mark{position:absolute;right:0;top:0;font:700 34px/${lineHeight}px sans-serif}.part{border-bottom:3px solid #b6a9ff}.numbered{position:relative}.numbered:after{content:'1';position:absolute;right:-10px;top:-16px;width:20px;height:20px;border-radius:50%;background:#5749db;color:white;text-align:center;font:500 14px/20px sans-serif}
  .hljs-keyword,.hljs-literal{color:#c4a5ff}.hljs-number{color:#ffcd91}.hljs-string,.hljs-template-variable{color:#b5e39c}.hljs-title,.hljs-type{color:#96d4ff}.hljs-comment{color:#a0a0ac}.hljs-built_in,.hljs-params{color:#f4dfa3}
  #panel{flex:1;min-width:0;max-height:100%;display:flex;flex-direction:column;gap:16px;justify-content:center;overflow:hidden}
  .value-box{display:flex;min-height:76px;border:3px solid #dddde2;border-radius:12px;overflow:hidden;flex-shrink:0}.value-box.active{border-color:#5749db}.name{display:flex;align-items:center;max-width:48%;padding:12px 16px;background:#eeeef2;font:400 28px 'JetBrains Mono',ui-monospace,monospace}.value-content{flex:1;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 16px}.value-content strong{display:inline-block;font-size:38px;white-space:nowrap}.value-content small{font-size:22px;white-space:nowrap}.answer{display:flex;align-items:center}.calls-heading{font-size:28px;color:#5c5c66}.call-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:18px 12px;border-bottom:2px solid #dddde2;flex-shrink:0}.call-row code{font:400 28px 'JetBrains Mono',ui-monospace,monospace}.call-row strong{font-size:34px}.call-row small{grid-column:1/-1;text-align:right;font-size:22px;color:#5c5c66}
  </style><div id="card"><div id="heading"><span>${scene.role === "point" ? `要点 ${scene.point}` : scene.role === "recap" ? "まとめ" : "つかみ"}</span><h2>${safe(scene.title)}</h2></div><div id="content"><div id="code"></div><div id="panel" ${scene.panel ? "" : 'style="display:none"'}></div></div></div><div id="caption"></div><script>(${runtime.toString()})(${JSON.stringify(data).replace(/</g, "\\u003c")},${codeFrame.toString()},${sceneCaptionAt.toString()});</script></html>`;
}
