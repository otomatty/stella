export function couponPrice(total) {
  if (total >= 1000) {
    return total - 100;
  }
  return total;
}

export function canCollectOrder(isPaid, isReady) {
  return isPaid && isReady;
}

export function isDefaultLocker(code) {
  return code === 0;
}
