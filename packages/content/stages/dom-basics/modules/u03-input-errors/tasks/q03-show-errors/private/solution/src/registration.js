function validateName(value) {
  return value.trim() === "" ? "名前を入力してください。" : "";
}

function validateEmail(value) {
  return value.includes("@") ? "" : "メールアドレスに@を含めてください。";
}

function validatePeople(value) {
  const people = Number(value);
  if (
    value.trim() === "" ||
    !Number.isInteger(people) ||
    people < 1 ||
    people > 10
  ) {
    return "人数は1〜10の整数で入力してください。";
  }
  return "";
}

function updateError(input, error, message) {
  error.textContent = message;
  if (message === "") {
    input.removeAttribute("aria-invalid");
  } else {
    input.setAttribute("aria-invalid", "true");
  }
}

export function setupRegistration(root) {
  const form = root.querySelector("#registration");
  const result = root.querySelector("output");
  const fields = [
    {
      input: root.querySelector("#name"),
      error: root.querySelector("#name-error"),
      validate: validateName,
    },
    {
      input: root.querySelector("#email"),
      error: root.querySelector("#email-error"),
      validate: validateEmail,
    },
    {
      input: root.querySelector("#people"),
      error: root.querySelector("#people-error"),
      validate: validatePeople,
    },
  ];

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let hasError = false;
    for (const { input, error, validate } of fields) {
      const message = validate(input.value);
      updateError(input, error, message);
      if (message !== "") {
        hasError = true;
      }
    }
    result.textContent = hasError ? "" : "登録が完了しました。";
  });

  for (const { input, error, validate } of fields) {
    input.addEventListener("input", () => {
      result.textContent = "";
      if (error.textContent !== "") {
        updateError(input, error, validate(input.value));
      }
    });
  }
}
