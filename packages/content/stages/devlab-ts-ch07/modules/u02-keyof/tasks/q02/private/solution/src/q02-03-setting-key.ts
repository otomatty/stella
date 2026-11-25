// 問3 型 SettingKey を、定数 SETTINGS のキーとして作る（keyof typeof SETTINGS）

export const SETTINGS = { theme: "light", fontSize: 14, beta: false };

export type SettingKey = keyof typeof SETTINGS;
