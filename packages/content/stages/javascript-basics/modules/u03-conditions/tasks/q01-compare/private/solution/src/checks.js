export function isFreeShipping(total) {
  return total >= 3000;
}

export function isAdult(age) {
  return age >= 18;
}

export function isPerfectScore(score) {
  return score === 100;
}

export function hasStock(stock) {
  return stock > 0;
}

export function matchesProductCode(inputCode, productCode) {
  return inputCode === productCode;
}

export function isPastDeadline(minute, deadline) {
  return minute > deadline;
}

export function isOverCapacity(count, capacity) {
  return count > capacity;
}

export function isEmptyText(text) {
  return text === "";
}
