function orderTotal(quantity, isMember) {
  const subtotal = 1364 * quantity;
  let discountedSubtotal = subtotal;
  if (isMember && subtotal >= 3000) {
    discountedSubtotal -= 300;
  }

  const tax = Math.floor(discountedSubtotal / 10);
  const taxedSubtotal = discountedSubtotal + tax;
  const shipping = taxedSubtotal >= 3000 ? 0 : 600;
  return taxedSubtotal + shipping;
}

function validateQuantity(value) {
  const quantity = Number(value);
  if (
    value.trim() === "" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    return "数量は1〜99の整数で入力してください。";
  }
  return "";
}

export function setupOrder(root) {
  const form = root.querySelector("#order");
  const quantityInput = root.querySelector("#quantity");
  const quantityError = root.querySelector("#quantity-error");
  const memberInput = root.querySelector("#member");
  const result = root.querySelector("output");

  function updateQuantityError(message) {
    quantityError.textContent = message;
    if (message === "") {
      quantityInput.removeAttribute("aria-invalid");
    } else {
      quantityInput.setAttribute("aria-invalid", "true");
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = validateQuantity(quantityInput.value);
    updateQuantityError(message);
    if (message !== "") {
      result.textContent = "";
      return;
    }

    const total = orderTotal(Number(quantityInput.value), memberInput.checked);
    result.textContent = `合計 ${total} 円`;
  });

  quantityInput.addEventListener("input", () => {
    result.textContent = "";
    if (quantityError.textContent !== "") {
      updateQuantityError(validateQuantity(quantityInput.value));
    }
  });

  memberInput.addEventListener("input", () => {
    result.textContent = "";
  });
}
