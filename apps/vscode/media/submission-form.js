(() => {
  const vscode = acquireVsCodeApi();
  const form = document.getElementById("submission-form");
  const status = document.getElementById("form-status");
  const debug = document.body.dataset.debug === "true";
  const debugKeys = ["reproduction", "expected", "cause", "fix", "regression"];
  const previous = vscode.getState();
  if (typeof previous?.explanation === "string") {
    document.getElementById("explanation").value = previous.explanation;
    if (debug) {
      for (const key of debugKeys) {
        if (typeof previous.debuggingRecord?.[key] === "string") {
          document.getElementById(key).value = previous.debuggingRecord[key];
        }
      }
    }
  }
  function draft() {
    return {
      explanation: document.getElementById("explanation").value,
      ...(debug
        ? {
            debuggingRecord: Object.fromEntries(
              debugKeys.map((key) => [key, document.getElementById(key).value]),
            ),
          }
        : {}),
    };
  }
  function send(action) {
    const current = draft();
    vscode.setState(current);
    vscode.postMessage({ token: document.body.dataset.token, action, draft: current });
  }
  form.addEventListener("input", () => {
    status.textContent = "下書きを保存しています…";
    status.className = "";
    send("change");
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    send("submit");
  });
  document.getElementById("save-draft").addEventListener("click", () => send("save"));
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.kind === "busy" || message.kind === "idle" || message.kind === "error") {
      for (const control of form.querySelectorAll("button, textarea"))
        control.disabled = message.kind === "busy";
    }
    if (message.kind === "busy") status.textContent = "送信しています…";
    if (message.kind === "saved") status.textContent = "下書きを保存しました";
    if (message.kind === "error") {
      status.textContent = message.message;
      status.className = "error";
    }
  });
})();
