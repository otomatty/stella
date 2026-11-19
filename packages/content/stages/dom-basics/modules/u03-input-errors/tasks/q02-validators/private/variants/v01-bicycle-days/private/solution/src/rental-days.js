export function validateDays(value) {
  const days = Number(value);
  if (!Number.isInteger(days) || !(2 <= days && days <= 14)) {
    return "貸出日数は2〜14の整数で入力してください。";
  }
  return "";
}
