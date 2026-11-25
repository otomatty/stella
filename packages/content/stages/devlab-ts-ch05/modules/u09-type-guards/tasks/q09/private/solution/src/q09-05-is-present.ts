// 問5 【型ガード】string | null を受け取り、null でないか。戻り値の型は value is string
//     例: isPresent(null) → false

export function isPresent(value: string | null): value is string {
  return value !== null;
}
