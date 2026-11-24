// 問20 ENDPOINTS から URL を返す。引数の型は keyof typeof ENDPOINTS
//     例: endpointOf("rooms") → "/api/rooms"
// 定義済みの定数は書き換えません。
// 引数と戻り値に型注釈を付けます。

export const ENDPOINTS = { users: "/api/users", rooms: "/api/rooms" } as const;

export function endpointOf(name: keyof typeof ENDPOINTS): string {
  return ENDPOINTS[name];
}
