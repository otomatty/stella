export function canUseMemberDiscount(isMember, total) {
  return isMember && total >= 5000;
}

export function canSendNotice(isWeekday, hour) {
  return isWeekday || hour >= 18;
}

export function canAcceptRequest(isOpen, slots) {
  if (!isOpen) {
    return false;
  }
  return slots > 0;
}

export function checkPickupCode(inputCode, expectedCode) {
  if (inputCode === "") {
    return null;
  }
  return inputCode === expectedCode;
}

export function isPickupHour(hour) {
  return hour >= 9 && hour < 17;
}

export function canReserveItem(isSuspended, stock, hasVoucher) {
  if (isSuspended) {
    return false;
  }
  return stock > 0 || hasVoucher;
}
