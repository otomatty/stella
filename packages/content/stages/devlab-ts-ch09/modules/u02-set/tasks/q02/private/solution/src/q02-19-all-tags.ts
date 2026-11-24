// 問19 投稿のタグを、重複なく出てきた順に並べた配列を返す
//     例: allTags([{ tags: ["ts", "js"] }, { tags: ["js", "css"] }]) → ["ts", "js", "css"]
// 引数と戻り値に型注釈を付けます。
// 重複や要素の有無を調べるために Set を使います。
// 引数の配列は変更しません。
// Set の要素をスプレッド構文で配列にします。

export function allTags(posts: { tags: string[] }[]): string[] {
  return [...new Set(posts.flatMap((post) => post.tags))];
}
