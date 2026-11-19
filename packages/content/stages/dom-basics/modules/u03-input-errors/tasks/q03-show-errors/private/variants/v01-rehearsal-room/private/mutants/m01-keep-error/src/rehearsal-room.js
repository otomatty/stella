function validateGroup(value) {
  return value.trim() ? "" : "団体名を入力してください。";
}

function validateHours(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 4
    ? ""
    : "利用時間は1〜4時間の整数で入力してください。";
}

function showError(input, error, message) {
  error.textContent = message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

export function setupRehearsalRoom(root) {
  const form = root.querySelector("#rehearsal-room");
  const result = root.querySelector("output");
  const fields = [
    ["group", validateGroup],
    ["hours", validateHours],
  ].map(([id, validate]) => ({
    input: root.querySelector(`#${id}`),
    error: root.querySelector(`#${id}-error`),
    validate,
  }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let valid = true;
    for (const { input, error, validate } of fields) {
      const message = validate(input.value);
      showError(input, error, message);
      if (message) {
        valid = false;
      }
    }
    result.textContent = valid ? "利用申込を受け付けました。" : "";
  });

  form.addEventListener("input", () => {
    result.textContent = "";
  });
}
