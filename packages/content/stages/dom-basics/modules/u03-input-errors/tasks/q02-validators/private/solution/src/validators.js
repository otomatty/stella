export function validateRequired(value) {
  return value.trim() === "" ? "入力してください。" : "";
}

export function validateLength(value) {
  return value.length > 10 ? "10文字以内で入力してください。" : "";
}

export function validateQuantity(value) {
  const text = value.trim();
  if (text === "") {
    return "数量は1〜10の整数で入力してください。";
  }
  const quantity = Number(text);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    return "数量は1〜10の整数で入力してください。";
  }
  return "";
}

export function validateEmail(value) {
  return value.includes("@") ? "" : "メールアドレスに@を含めてください。";
}

export function validateConfirmation(value, confirmation) {
  return value === confirmation ? "" : "確認用の入力が一致しません。";
}

export function validatePostalCode(value) {
  if (value.length !== 7 || /[^0-9]/.test(value)) {
    return "郵便番号は半角数字7桁で入力してください。";
  }
  return "";
}
