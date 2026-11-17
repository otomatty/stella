// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問13
export function validateUsername(name: string): void {
  if (name === "") {
    throw new Error("名前を入力してください");
  }
  if (name.length > 20) {
    throw new Error("20文字以内にしてください");
  }
  if (name.includes(" ")) {
    throw new Error("空白は使えません");
  }
}
