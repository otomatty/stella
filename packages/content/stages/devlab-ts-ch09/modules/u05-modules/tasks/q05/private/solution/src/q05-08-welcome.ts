// 問8 shared/q05-modules.lib のデフォルト export（関数 greet）を import し、greet(name) の後ろに "！" を付けて返す welcome(name) を書く
//     例: welcome("山田") → "ようこそ、山田さん！"

import greet from "./shared/q05-modules.lib";

export function welcome(name: string): string {
  return `${greet(name)}！`;
}
