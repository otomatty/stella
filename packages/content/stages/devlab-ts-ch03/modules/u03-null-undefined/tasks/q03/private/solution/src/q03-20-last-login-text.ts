// 問20 { lastLoginAt: Date | null } を「2026-12-01」の形にする（toISOString の先頭10文字）。null なら「未ログイン」
//     例: lastLoginText({ lastLoginAt: null }) → "未ログイン"
// 引数と戻り値に型注釈を付ける。
// ?. と ?? で、値がない場合を扱う。

export function lastLoginText(user: { lastLoginAt: Date | null }): string {
  return user.lastLoginAt?.toISOString().slice(0, 10) ?? "未ログイン";
}
