export function checkout(price: number, quantity: number, coupon: number): number {
  const subtotal = price * quantity;
  let total = subtotal - coupon;
  if (total < 0) {
    total = 0;
  }
  if (total < 5000) {
    total += 500;
  }
  return total;
}
