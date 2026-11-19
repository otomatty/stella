export function setupInputs(root) {
  const greetingForm = root.querySelector("#greeting-form");
  const nameInput = greetingForm.querySelector("#name");
  greetingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    greetingForm.querySelector("output").textContent =
      name === "" ? "" : `こんにちは、${name}さん。`;
  });

  const lengthForm = root.querySelector("#length-form");
  const messageInput = lengthForm.querySelector("#message");
  lengthForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const remaining = Math.max(0, 10 - messageInput.value.length);
    lengthForm.querySelector("output").textContent = `あと ${remaining} 文字`;
  });

  const totalForm = root.querySelector("#total-form");
  const quantityInput = totalForm.querySelector("#quantity");
  totalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = quantityInput.value;
    totalForm.querySelector("output").textContent =
      value === "" ? "" : `合計 ${Number(value) * 250} 円`;
  });

  const noteForm = root.querySelector("#note-form");
  const noteInput = noteForm.querySelector("#note");
  noteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    noteForm.querySelector("output").textContent = noteInput.value.trim();
  });

  const memberForm = root.querySelector("#member-form");
  const memberInput = memberForm.querySelector("#member");
  memberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    memberForm.querySelector("output").textContent = memberInput.checked
      ? "会員"
      : "非会員";
  });

  const deliveryForm = root.querySelector("#delivery-form");
  const deliveryInput = deliveryForm.querySelector("#delivery");
  deliveryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    deliveryForm.querySelector("output").textContent = deliveryInput.value;
  });
}
