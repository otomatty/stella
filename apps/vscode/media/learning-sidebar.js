(() => {
  const vscode = acquireVsCodeApi();
  let token = document.body.dataset.messageToken;
  let scope = document.body.dataset.scope;
  let previous = vscode.getState();
  const status = document.getElementById("loading-status");
  const main = document.querySelector("main");
  function restore() {
    if (!previous) return;
    requestAnimationFrame(() => {
      const sameUnit = previous.scope === scope;
      const selectedUnit = previous.focusId === "stage" || previous.focusId === "section";
      if (document.hasFocus() && (sameUnit || selectedUnit)) {
        document.getElementById(previous.focusId)?.focus({ preventScroll: true });
      }
      window.scrollTo(0, sameUnit ? (previous.scrollY ?? 0) : 0);
    });
  }
  window.addEventListener("message", (event) => {
    if (event.data?.type !== "render" || typeof event.data.html !== "string") return;
    const next = new DOMParser().parseFromString(event.data.html, "text/html");
    const nextMain = next.querySelector("main");
    const nextFooter = next.querySelector("footer");
    if (!nextMain || !nextFooter) return;
    const wasLoading = main.getAttribute("aria-busy") === "true";
    if (!wasLoading) {
      previous = { scope, scrollY: window.scrollY, focusId: document.activeElement?.id };
      vscode.setState(previous);
    }
    const loading = nextMain.getAttribute("aria-busy") === "true";
    main.setAttribute("aria-busy", String(loading));
    main.dataset.state = nextMain.dataset.state;
    main.replaceChildren(...nextMain.childNodes);
    document.querySelector("footer").replaceWith(nextFooter);
    token = next.body.dataset.messageToken;
    scope = next.body.dataset.scope;
    document.body.dataset.messageToken = token;
    document.body.dataset.scope = scope;
    // この要素は置き換えず、aria-busy の外でテキストの変更を通知する。
    status.textContent = loading
      ? "学習の状況を読み込んでいます…"
      : wasLoading
        ? nextMain.dataset.state === "error"
          ? "教材を読み込めませんでした。"
          : nextMain.dataset.state === "disconnected"
            ? "Web への接続が必要です。"
            : "学習の状況を読み込みました。"
        : "";
    if (!loading) restore();
  });
  function send(message) {
    vscode.setState({ scope, scrollY: window.scrollY, focusId: document.activeElement?.id });
    vscode.postMessage({ ...message, token });
  }
  document.addEventListener("change", (event) => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    send({ action: select.dataset.select, id: select.value });
  });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    send({
      action: button.dataset.action,
      id: button.dataset.lesson ?? button.dataset.section,
    });
  });
  restore();
  vscode.postMessage({ action: "ready", token });
})();
