// 問12 message の Error を投げる関数。戻り値の型は never（決して値を返さない）
//     例: fail("だめ") → Error "だめ"
export function fail(message: string): never {
  throw new Error(message);
}
