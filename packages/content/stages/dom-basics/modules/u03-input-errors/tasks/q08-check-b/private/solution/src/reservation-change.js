function validatePeople(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 2 && count <= 8
    ? ""
    : "人数は2〜8の整数で入力してください。";
}

function validateDate(value) {
  return value.trim() ? "" : "変更後の日付を入力してください。";
}

function validateReason(value) {
  const length = value.trim().length;
  return length >= 5 && length <= 60
    ? ""
    : "変更理由は5〜60文字で入力してください。";
}

function showError(input, error, message) {
  error.textContent = message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

export function setupReservationChange(root) {
  const form = root.querySelector("#reservation-change");
  const result = root.querySelector("output");
  const fields = [
    ["people", validatePeople],
    ["date", validateDate],
    ["reason", validateReason],
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
    result.textContent = valid ? "予約の変更を受け付けました。" : "";
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
