export const TAX_RATE = 0.1;

export function priceWithTax(price: number): number {
  return Math.round(price * (1 + TAX_RATE));
}
