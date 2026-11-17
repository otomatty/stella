// 値を直せば型も変わるので、型と値の食い違いが起きない。型を2か所で書き直す手間もない
export const DEFAULT_CONFIG = {
  host: "localhost",
  port: 3000,
  debug: false,
  features: { chat: true, video: false },
};

export const THEMES = ["light", "dark", "system"] as const;

export type Config = typeof DEFAULT_CONFIG;

export function mergeConfig(partial: { host?: string; port?: number; debug?: boolean }): Config {
  return { ...DEFAULT_CONFIG, ...partial };
}

export type Theme = (typeof THEMES)[number];

export function isTheme(text: string): text is Theme {
  return THEMES.some((theme) => theme === text);
}
