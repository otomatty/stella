// 03-q06 インターセクション型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 問題
// 投稿の中身を表す型 Post と、保存したときに付く情報を表す型 Meta は定義済みです。
//
// 1. 型 SavedPost を、Post と Meta のインターセクション型として定義して export する
//
// 2. savePost(post, id, createdAt)
//    post に id と createdAt を足した SavedPost を返す
//
// 3. 型 EditedPost を、SavedPost と { updatedAt: Date } のインターセクション型として定義して export する
//
// 4. editPost(saved, body, updatedAt)
//    body を書き換え、updatedAt を足した EditedPost を返す。元の saved は変えない

export type Post = {
  title: string;
  body: string;
};

export type Meta = {
  id: number;
  createdAt: Date;
};

export type SavedPost = unknown;

export type EditedPost = unknown;

export function savePost() {}

export function editPost() {}
