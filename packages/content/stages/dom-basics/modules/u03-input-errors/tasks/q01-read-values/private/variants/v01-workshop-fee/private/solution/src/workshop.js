export function setupWorkshop(root) {
  const form = root.querySelector("form");
  const kits = root.querySelector("#kits");
  const output = root.querySelector("output");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (kits.value === "") {
      output.textContent = "";
      return;
    }

    const total = (Number(kits.value) + 1) * 480;
    output.textContent = `参加費は${total}円です。`;
  });
}
