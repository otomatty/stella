import { validateRequired } from "./validators.js";

export function setupPreview(root) {
  const form = root.querySelector("#preview-form");
  const nameInput = form.querySelector("#name");
  const error = form.querySelector("#name-error");
  const result = form.querySelector("output");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = validateRequired(nameInput.value);
    error.textContent = message ?? "";
    result.textContent = message === "" ? "入力を確認しました。" : "";
  });
}
