// 問16 下の関数 farewell を、このファイルのデフォルト export にする（export default）
//     例: import farewell from "./q05-16-farewell" で使える

function farewell(name: string): string {
  return `さようなら、${name}さん`;
}

export default farewell;
