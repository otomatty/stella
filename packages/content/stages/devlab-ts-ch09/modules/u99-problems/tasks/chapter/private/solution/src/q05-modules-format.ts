export default function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}
