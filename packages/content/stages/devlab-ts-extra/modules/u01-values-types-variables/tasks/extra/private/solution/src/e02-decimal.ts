// 0.1 や 0.2 は2進数では割り切れず、近い値で表されるため、足すと誤差が表に出る
export function addPrices(a: number, b: number): number {
  return (Math.round(a * 100) + Math.round(b * 100)) / 100;
}

export function multiplyPrice(price: number, quantity: number): number {
  return (Math.round(price * 100) * quantity) / 100;
}
