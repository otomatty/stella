import type { GuideStep } from "./guide-clips.js";

/** 録画ページだけへ注入する。HTML の内容・ハイライトの色・レイアウトは保つ。 */
export async function guideMotion(step: GuideStep, prepare = false) {
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const animate = (ms: number, draw: (progress: number) => void) =>
    new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        // rAF のフレーム開始時刻は start より前になる場合がある。
        const p = Math.max(0, Math.min(1, (now - start) / ms));
        draw(p);
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      draw(0);
      requestAnimationFrame(tick);
    });
  if (!document.getElementById("guide-motion-style")) {
    const style = document.createElement("style");
    style.id = "guide-motion-style";
    style.textContent = `
      html { scroll-behavior: auto !important; }
      .guide-spot { position:fixed; pointer-events:none; z-index:2147483647; border-radius:8px;
        box-shadow:0 0 0 9999px #0e0e1038; outline:2px solid #6470e866; }
      [data-guide-hidden] { visibility:hidden !important; }
      .guide-line { position:absolute; left:0; right:0; pointer-events:none; background:#6470e82b; }
    `;
    document.head.append(style);
  }
  if (!prepare) document.querySelector(".guide-spot")?.remove();
  if (step.do === "wait") {
    if (!prepare) await sleep(step.seconds * 1000);
    return;
  }
  const el = document.querySelector<HTMLElement>(step.to);
  if (!el) throw new Error(`セレクタが見つかりません: ${step.to}`);
  const children = () => {
    if (step.do === "rows")
      return [...el.querySelectorAll<HTMLElement>(":scope > div > dt, :scope > div > dd")];
    if (el.matches("figure.anat"))
      return [...el.querySelectorAll<HTMLElement>(".seg")].sort(
        (a, b) =>
          Number(a.querySelector("i")?.textContent) - Number(b.querySelector("i")?.textContent),
      );
    if (el.matches("table")) return [...el.querySelectorAll<HTMLElement>("tbody > tr")];
    return [...el.children] as HTMLElement[];
  };
  if (prepare) {
    if (step.do === "rows" || step.do === "reveal") {
      const items = children();
      if (!items.length) throw new Error(`${step.do} の子要素がありません: ${step.to}`);
      for (const item of items) item.dataset.guideHidden = "";
    }
    if (step.do === "type") {
      if (!el.matches("pre")) throw new Error(`type は pre を指定してください: ${step.to}`);
      if (el.querySelector("[data-guide-char]")) return;
      // childNodes は生きた一覧なので先にコピーする。hljs-* の入れ子も辿り、
      // 元の要素を残したまま、すべてのテキストノードを置き換える。
      const wrap = (parent: Node) => {
        for (const node of [...parent.childNodes]) {
          if (node.nodeType !== Node.TEXT_NODE) {
            wrap(node);
            continue;
          }
          const fragment = document.createDocumentFragment();
          for (const char of node.textContent ?? "") {
            // 改行は元のまま残す。隠した文字も幅を占め、行高と折り返しを保つ。
            if (char === "\n" || char === "\r") {
              fragment.append(document.createTextNode(char));
              continue;
            }
            const span = document.createElement("span");
            span.textContent = char;
            span.dataset.guideChar = "";
            span.dataset.guideHidden = "";
            fragment.append(span);
          }
          parent.replaceChild(fragment, node);
        }
      };
      wrap(el);
    }
    return;
  }
  // 別の遠い項目へ一気に飛ばず、各操作の前にも決まった長さで画面を寄せる。
  const scroll = async () => {
    const from = window.scrollY;
    const to = Math.max(
      0,
      Math.min(
        document.documentElement.scrollHeight - innerHeight,
        from + el.getBoundingClientRect().top - 48,
      ),
    );
    if (Math.abs(to - from) < 2) return;
    await animate(700, (p) => window.scrollTo(0, from + (to - from) * p * p * (3 - 2 * p)));
  };
  if (step.do === "scroll") {
    await scroll();
  } else {
    // 画面内に収まっている対象ではスクロールしない。
    const rect = el.getBoundingClientRect();
    if (rect.top < 24 || rect.bottom > innerHeight - 24) await scroll();
    if (step.do === "focus") {
      const rect = el.getBoundingClientRect();
      const spot = document.createElement("div");
      spot.className = "guide-spot";
      Object.assign(spot.style, {
        left: `${rect.left - 6}px`,
        top: `${rect.top - 6}px`,
        width: `${rect.width + 12}px`,
        height: `${rect.height + 12}px`,
      });
      document.body.append(spot);
      await animate(700, (p) => {
        spot.style.opacity = String(p);
      });
    } else if (step.do === "open") {
      if (!(el instanceof HTMLDetailsElement))
        throw new Error(`open は details を指定してください: ${step.to}`);
      const from = el.getBoundingClientRect().height;
      el.open = true;
      const to = el.getBoundingClientRect().height;
      const previous = el.getAttribute("style");
      el.style.overflow = "hidden";
      await animate(900, (p) => {
        el.style.height = `${from + (to - from) * p * p * (3 - 2 * p)}px`;
      });
      if (previous === null) el.removeAttribute("style");
      else el.setAttribute("style", previous);
    } else if (step.do === "lines") {
      if (!el.matches("pre")) throw new Error(`lines は pre を指定してください: ${step.to}`);
      const css = getComputedStyle(el);
      const height = Number.parseFloat(css.lineHeight);
      const lines = (el.textContent ?? "").split("\n").length;
      const band = document.createElement("div");
      band.className = "guide-line";
      const position = el.style.position;
      el.style.position = "relative";
      band.style.height = `${height}px`;
      el.append(band);
      await animate(1800, (p) => {
        band.style.top = `${Number.parseFloat(css.paddingTop) + Math.min(lines - 1, Math.floor(p * lines)) * height}px`;
      });
      band.remove();
      el.style.position = position;
    } else if (step.do === "type") {
      const chars = [...el.querySelectorAll<HTMLElement>("[data-guide-char]")];
      for (const char of chars) char.dataset.guideHidden = "";
      await animate(1800, (p) => {
        for (const char of chars.slice(0, Math.floor(chars.length * p)))
          delete char.dataset.guideHidden;
      });
    } else {
      const items = children();
      for (const item of items) item.dataset.guideHidden = "";
      // rows は dt（呼び出し）→ dd.r（結果）→ dd.c（注記）。レイアウトは動かさない。
      await animate(1800, (p) => {
        for (const item of items.slice(0, Math.min(items.length, Math.floor(p * items.length) + 1)))
          delete item.dataset.guideHidden;
      });
    }
  }
  await sleep(500);
}
