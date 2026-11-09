// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const ENDPOINTS = { users: "/api/users", rooms: "/api/rooms" } as const;

// 問20
export function endpointOf(name: keyof typeof ENDPOINTS): string {
  return ENDPOINTS[name];
}
