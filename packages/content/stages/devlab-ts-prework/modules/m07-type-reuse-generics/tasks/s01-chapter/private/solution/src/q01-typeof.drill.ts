export const DEFAULT_USER = { name: "ゲスト", age: 0, admin: false };
export const ORIGIN = { x: 0, y: 0 };
export const SETTINGS = {
  theme: "light",
  fontSize: 14,
  notifications: { email: true, push: false },
};
export const COLORS = ["red", "green", "blue"] as const;
export const LEVELS = [1, 2, 3] as const;
export const ROLE_LABELS = { admin: "管理者", member: "一般" } as const;
export const ENDPOINTS = { users: "/api/users", rooms: "/api/rooms" } as const;
export const VERSION = "1.2.3";
export const MAX_SIZE = 100;
export const TAGS = ["new", "sale"];

export function makeItem(name: string, price: number) {
  return { name, price, createdAt: 0 };
}

export function handleClick(x: number, y: number): string {
  return `${x},${y}`;
}

// 問1
export type DefaultUser = typeof DEFAULT_USER;

// 問2
export type Point = typeof ORIGIN;

// 問3
export type Settings = typeof SETTINGS;

// 問4
export type Notifications = (typeof SETTINGS)["notifications"];

// 問5
export type Color = (typeof COLORS)[number];

// 問6
export type Level = (typeof LEVELS)[number];

// 問7
export type RoleLabels = typeof ROLE_LABELS;

// 問8
export type Endpoint = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];

// 問9
export type Version = typeof VERSION;

// 問10
export type MaxSize = typeof MAX_SIZE;

// 問11
export type Tag = (typeof TAGS)[number];

// 問12
export type Item = ReturnType<typeof makeItem>;

// 問13
export type ClickHandler = typeof handleClick;

// 問14
export function cloneUser(): typeof DEFAULT_USER {
  return { ...DEFAULT_USER };
}

// 問15
export function movePoint(point: typeof ORIGIN, dx: number, dy: number): typeof ORIGIN {
  return { x: point.x + dx, y: point.y + dy };
}

// 問16
export function withFontSize(settings: typeof SETTINGS, size: number): typeof SETTINGS {
  return { ...settings, fontSize: size };
}

// 問17
export function isColor(text: string): text is (typeof COLORS)[number] {
  return COLORS.some((color) => color === text);
}

// 問18
export function nextLevel(level: (typeof LEVELS)[number]): (typeof LEVELS)[number] {
  return LEVELS[LEVELS.indexOf(level) + 1] ?? level;
}

// 問19
export function roleLabel(role: keyof typeof ROLE_LABELS): string {
  return ROLE_LABELS[role];
}

// 問20
export function endpointOf(name: keyof typeof ENDPOINTS): string {
  return ENDPOINTS[name];
}
