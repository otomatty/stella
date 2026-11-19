export function orderTotal(unitPrice, quantity, isMember) {
  if (quantity === 0) {
    return 0;
  }
  const subtotal = unitPrice * quantity;
  let discountedSubtotal = subtotal;
  if (isMember && subtotal >= 3000) {
    discountedSubtotal -= 300;
  }

  const tax = Math.floor(discountedSubtotal / 10);
  const taxedSubtotal = discountedSubtotal + tax;
  let shippingFee = 600;
  if (taxedSubtotal >= 3000) {
    shippingFee = 0;
  }
  return taxedSubtotal + shippingFee;
}
