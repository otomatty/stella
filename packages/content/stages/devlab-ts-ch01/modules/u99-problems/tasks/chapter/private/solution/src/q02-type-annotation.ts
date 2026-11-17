export function formatPrice(price: number, unit: string): string {
  return `${price.toLocaleString("ja-JP")}${unit}`;
}

export function describeMember(name: string, age: number, isLeader: boolean): string {
  if (isLeader) {
    return `${name}（${age}歳・リーダー）`;
  }
  return `${name}（${age}歳）`;
}
