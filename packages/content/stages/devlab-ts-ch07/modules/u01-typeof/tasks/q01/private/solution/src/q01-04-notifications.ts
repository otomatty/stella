// 問4 型 Notifications を、SETTINGS の notifications プロパティの型として作る（(typeof SETTINGS)["notifications"]）
// 定義済みの定数は書き換えません。

export const SETTINGS = {
  theme: "light",
  fontSize: 14,
  notifications: { email: true, push: false },
};

export type Notifications = (typeof SETTINGS)["notifications"];
