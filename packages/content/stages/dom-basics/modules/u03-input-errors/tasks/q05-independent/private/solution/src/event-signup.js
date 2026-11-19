function validatePeople(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 20
    ? ""
    : "人数は1〜20の整数で入力してください。";
}

function validateDate(value) {
  return value.trim() ? "" : "参加日を入力してください。";
}

function validateContact(value) {
  const contact = value.trim();
  return contact.includes("@") || /^\d{10,11}$/.test(contact)
    ? ""
    : "連絡先はメールアドレスか10〜11桁の電話番号を入力してください。";
}

function showError(input, error, message) {
  error.textContent = message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

export function setupEventSignup(root) {
  const form = root.querySelector("#event-signup");
  const result = root.querySelector("output");
  const fields = [
    ["people", validatePeople],
    ["date", validateDate],
    ["contact", validateContact],
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
    result.textContent = valid ? "参加申込を受け付けました。" : "";
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
