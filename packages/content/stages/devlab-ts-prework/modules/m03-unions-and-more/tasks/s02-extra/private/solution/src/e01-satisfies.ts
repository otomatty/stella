// 型注釈だと ROUTES の型は { [name: string]: Route } になり、キー名が消える。
// satisfies は形を確かめるだけで、ROUTES の型は書いた中身から推論されたまま残る
export type Route = { path: string; auth: boolean };

export const ROUTES = {
  home: { path: "/", auth: false },
  settings: { path: "/settings", auth: true },
  admin: { path: "/admin", auth: true },
} satisfies { [name: string]: Route };

export type RouteName = keyof typeof ROUTES;

export function pathOf(name: RouteName): string {
  return ROUTES[name].path;
}

export function protectedPaths(): string[] {
  return Object.values(ROUTES)
    .filter((route) => route.auth)
    .map((route) => route.path);
}
