export function paginate(items: readonly string[], page = 1, perPage = 10): string[] {
  if (page < 1) {
    throw new Error("page は1以上にしてください");
  }
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

export function repeatText(text: string, times = 2, separator = ""): string {
  return Array.from({ length: times }, () => text).join(separator);
}

export function formatPrice(price: number, currency = "円", withTax = false): string {
  const amount = withTax ? Math.floor((price * 110) / 100) : price;
  return `${amount.toLocaleString("ja-JP")}${currency}`;
}
