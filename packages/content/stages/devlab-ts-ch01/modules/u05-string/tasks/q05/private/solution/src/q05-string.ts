// 問題
// 次の3つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. slugify(title)
//    URLに使える形に変える。前後の空白を取り除き、英字を小文字にし、
//    間の空白（いくつ続いていても）をハイフン1つにする
//    例: slugify("  Hello TypeScript   World ") → "hello-typescript-world"
//    ヒント: trim、toLowerCase、replace。空白の並びは正規表現 /\s+/g で表せる
//
// 2. truncate(text, max)
//    text が max 文字以下なら、そのまま返す。
//    max 文字を超えるなら、末尾を「…」にして、全体がちょうど max 文字になるように切る
//    例: truncate("TypeScript入門", 6) → "TypeS…"
//        truncate("短い文", 10)       → "短い文"
//    max が 1 より小さいときは Error を投げる
//
// 3. maskEmail(email)
//    メールアドレスの「@」より前を、先頭1文字と「***」に置き換える
//    例: maskEmail("taro@example.com") → "t***@example.com"
//    「@」がないとき、「@」より前が空のときは Error を投げる
//    ヒント: indexOf、slice

export function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, "-");
}

export function truncate(text: string, max: number): string {
  if (max < 1) {
    throw new Error("max は 1 以上にしてください");
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) {
    throw new Error("メールアドレスの形になっていません");
  }
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}
