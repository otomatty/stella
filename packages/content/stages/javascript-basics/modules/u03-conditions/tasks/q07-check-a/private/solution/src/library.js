export function loanLateFee(isSuspended, borrowedCount, overdueDays) {
  if (isSuspended || borrowedCount >= 5) {
    return null;
  }
  if (overdueDays <= 2) {
    return 0;
  }
  return (overdueDays - 2) * 50;
}
