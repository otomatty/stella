// 問16 settings の fontSize だけを変えた新しい設定を返す。設定の型は typeof SETTINGS
//     例: withFontSize(SETTINGS, 18).fontSize → 18
// 定義済みの定数は書き換えません。
// 引数と戻り値に型注釈を付けます。

export const SETTINGS = {
  theme: "light",
  fontSize: 14,
  notifications: { email: true, push: false },
};

export function withFontSize(settings: typeof SETTINGS, size: number): typeof SETTINGS {
  return { ...settings, fontSize: size };
}
