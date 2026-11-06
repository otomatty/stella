export type User = { id: number; name: string; email: string; password: string; age: number };
export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// 問1
export type UserName = Pick<User, "name">;

// 問2
export type UserContact = Pick<User, "name" | "email">;

// 問3
export type SafeUser = Omit<User, "password">;

// 問4
export type NewUser = Omit<User, "id">;

// 問5
export type ArticleSummary = Pick<Article, "id" | "title">;

// 問6
export type ArticleDraft = Omit<Article, "id" | "publishedAt">;

// 問7
export function toContact(user: User): Pick<User, "name" | "email"> {
  return { name: user.name, email: user.email };
}

// 問8
export function toSafeUser(user: User): Omit<User, "password"> {
  return { id: user.id, name: user.name, email: user.email, age: user.age };
}

// 問9
export function toSummary(article: Article): Pick<Article, "id" | "title"> {
  return { id: article.id, title: article.title };
}

// 問10
export function createUser(input: Omit<User, "id">, id: number): User {
  return { ...input, id };
}

// 問11
export function publish(draft: Omit<Article, "id" | "publishedAt">, id: number, at: Date): Article {
  return { ...draft, id, publishedAt: at };
}

// 問12
export function summaries(articles: readonly Article[]): Pick<Article, "id" | "title">[] {
  return articles.map((a) => ({ id: a.id, title: a.title }));
}

// 問13
export function safeUsers(users: readonly User[]): Omit<User, "password">[] {
  return users.map((u) => ({ id: u.id, name: u.name, email: u.email, age: u.age }));
}

// 問14
export type UserPatch = Partial<Pick<User, "name" | "email" | "age">>;

export function patchUser(user: User, patch: UserPatch): User {
  return { ...user, ...patch };
}

// 問15
export type AuthorInfo = Pick<Article, "author"> & { articleCount: number };

export function authorInfo(articles: readonly Article[], author: string): AuthorInfo {
  return { author, articleCount: articles.filter((a) => a.author === author).length };
}

// 問16
export function findContact(
  users: readonly User[],
  id: number,
): Pick<User, "name" | "email"> | undefined {
  const user = users.find((u) => u.id === id);
  return user === undefined ? undefined : { name: user.name, email: user.email };
}

// 問17
export type Credentials = Pick<User, "email" | "password">;

export function login(
  users: readonly User[],
  credentials: Credentials,
): Omit<User, "password"> | undefined {
  const user = users.find(
    (u) => u.email === credentials.email && u.password === credentials.password,
  );
  if (user === undefined) {
    return undefined;
  }
  return { id: user.id, name: user.name, email: user.email, age: user.age };
}

// 問18
export type PublicArticle = Omit<Article, "body">;

export function toPublicArticle(article: Article): PublicArticle {
  return {
    id: article.id,
    title: article.title,
    author: article.author,
    publishedAt: article.publishedAt,
  };
}

// 問19
export type Teaser = Pick<Article, "title"> & { excerpt: string };

export function toTeaser(article: Article): Teaser {
  const excerpt = article.body.length > 10 ? `${article.body.slice(0, 10)}…` : article.body;
  return { title: article.title, excerpt };
}

// 問20
export type UserRow = Pick<User, "id" | "name" | "age">;

export function toRows(users: readonly User[]): UserRow[] {
  return users.map((u) => ({ id: u.id, name: u.name, age: u.age })).sort((a, b) => a.id - b.id);
}
