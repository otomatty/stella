(() => {
  const vscode = acquireVsCodeApi();
  const token = document.body.dataset.messageToken;
  const scope = document.body.dataset.scope;
  const previous = vscode.getState();
  if (previous) {
    requestAnimationFrame(() => {
      const sameUnit = previous.scope === scope;
      const selectedUnit = previous.focusId === "stage" || previous.focusId === "section";
      if (document.hasFocus() && (sameUnit || selectedUnit)) {
        document.getElementById(previous.focusId)?.focus({ preventScroll: true });
      }
      if (sameUnit) window.scrollTo(0, previous.scrollY ?? 0);
    });
  }
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
})();
