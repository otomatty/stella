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

export type SavedPost = Post & Meta;

export type EditedPost = SavedPost & { updatedAt: Date };

export function savePost(post: Post, id: number, createdAt: Date): SavedPost {
  return { ...post, id, createdAt };
}

export function editPost(saved: SavedPost, body: string, updatedAt: Date): EditedPost {
  return { ...saved, body, updatedAt };
}
