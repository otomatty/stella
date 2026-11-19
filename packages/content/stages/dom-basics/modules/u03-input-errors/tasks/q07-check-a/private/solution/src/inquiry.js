function validateSubject(value) {
  const length = value.trim().length;
  return length >= 1 && length <= 30
    ? ""
    : "件名は1〜30文字で入力してください。";
}

function validateBody(value) {
  const length = value.trim().length;
  return length >= 10 && length <= 100
    ? ""
    : "本文は10〜100文字で入力してください。";
}

function validateReply(value) {
  return value.includes("@") ? "" : "返信先に@を含めてください。";
}

function showError(input, error, message) {
  error.textContent = message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

export function setupInquiry(root) {
  const form = root.querySelector("#inquiry");
  const result = root.querySelector("output");
  const fields = [
    ["subject", validateSubject],
    ["body", validateBody],
    ["reply", validateReply],
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
    result.textContent = valid ? "問い合わせを受け付けました。" : "";
  });

  for (const { input, error, validate } of fields) {
    input.addEventListener("input", () => {
      result.textContent = "";
      if (input.getAttribute("aria-invalid") === "true") {
        showError(input, error, validate(input.value));
      }
    });
  }
}
