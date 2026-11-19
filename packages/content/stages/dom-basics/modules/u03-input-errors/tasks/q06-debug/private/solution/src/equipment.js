function validateItem(value) {
  return value.trim() ? "" : "備品名を入力してください。";
}

function validatePeople(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 6
    ? ""
    : "人数は1〜6の整数で入力してください。";
}

function showError(input, error, message) {
  error.textContent = message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

export function setupEquipment(root) {
  const form = root.querySelector("#equipment");
  const result = root.querySelector("output");
  const fields = [
    ["item", validateItem],
    ["people", validatePeople],
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
    result.textContent = valid ? "貸出を受け付けました。" : "";
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
