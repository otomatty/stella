import { validateDays } from "./rental-days.js";

export function setupRentalPreview(root) {
  const form = root.querySelector("form");
  const days = root.querySelector("#days");
  const output = root.querySelector("output");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    output.textContent = validateDays(days.value) || "貸出日数を確認しました。";
  });
}
