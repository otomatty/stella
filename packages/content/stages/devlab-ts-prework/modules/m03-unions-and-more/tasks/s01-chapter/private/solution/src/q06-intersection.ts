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
