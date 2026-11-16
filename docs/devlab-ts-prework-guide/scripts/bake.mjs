// コードブロックをハイライトして HTML に焼き込む（実行時の CDN に頼らない）
// 1. <code class="language-typescript"> の中身
// 2. 番号付きの部品図 (.anat pre)。全体をハイライトしてから、番号の下線 (.seg) を同じ位置に重ね直す
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import fs from "node:fs";

hljs.registerLanguage("typescript", typescript);
const file = process.argv[2];
let s = fs.readFileSync(file, "utf8");

const unesc = (t) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hl = (code) => hljs.highlight(code, { language: "typescript" }).value;

let blocks = 0;
s = s.replace(/<code class="language-typescript">([\s\S]*?)<\/code>/g, (_, body) => {
  blocks++;
  return `<code class="hl">${hl(unesc(body))}</code>`;
});

// ハイライト済みの HTML を「1 文字ずつのクラス」に平らにする
function flatten(html) {
  const chars = [];
  const stack = [];
  const re = /<span class="([^"]*)">|<\/span>|([^<]+)/g;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) stack.push(m[1]);
    else if (m[0] === "</span>") stack.pop();
    else for (const ch of unesc(m[2])) chars.push({ ch, cls: stack.at(-1) ?? "" });
  }
  return chars;
}

let anats = 0;
s = s.replace(/(<figure class="anat">\s*<pre>)([\s\S]*?)(<\/pre>)/g, (_, open, inner, close) => {
  anats++;
  // 番号付きの区間を取り出し、素のコードと区間の位置を作る
  const segs = [];
  let plain = "";
  const re = /<span class="(seg[^"]*)"><i>(\d+)<\/i>([\s\S]*?)<\/span>|([^<]+)/g;
  for (const m of inner.matchAll(re)) {
    if (m[1]) {
      const text = unesc(m[3]);
      segs.push({
        cls: m[1],
        n: m[2],
        start: [...plain].length,
        end: [...plain].length + [...text].length,
      });
      plain += text;
    } else plain += unesc(m[4]);
  }
  const chars = flatten(hl(plain));
  let out = "";
  let run = "";
  let runCls = null;
  const flush = () => {
    if (run) out += runCls ? `<span class="${runCls}">${esc(run)}</span>` : esc(run);
    run = "";
  };
  chars.forEach((c, i) => {
    const ends = segs.filter((g) => g.end === i);
    const starts = segs.filter((g) => g.start === i);
    if (ends.length || starts.length || c.cls !== runCls) flush();
    for (const _g of ends) out += "</span>";
    for (const g of starts) out += `<span class="${g.cls}"><i>${g.n}</i>`;
    runCls = c.cls;
    run += c.ch;
  });
  flush();
  for (const g of segs) if (g.end === chars.length) out += "</span>";
  return `${open}<code class="hl">${out}</code>${close}`;
});

s = s.replace(/\n<script src="https:\/\/cdnjs[\s\S]*<\/script>\n?$/, "\n");
fs.writeFileSync(file, s);
console.log("highlighted", blocks, "blocks and", anats, "numbered diagrams");
