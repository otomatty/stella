// 問13 ユーザー名を確かめ、問題があれば Error を投げる。空なら "名前を入力してください"、20文字より長ければ "20文字以内にしてください"、空白を含めば "空白は使えません"。問題なければ何も返さない（戻り値は void）
//     例: validateUsername("") → Error "名前を入力してください"
// 引数と戻り値に型注釈を付けます。
// 例外は throw new Error("メッセージ") で投げます。
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
