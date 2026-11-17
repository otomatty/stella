export type User = { name: string; age: number; role: "admin" | "member" };

export function createUser({
  name,
  age = 20,
  role = "member",
}: {
  name: string;
  age?: number;
  role?: "admin" | "member";
}): User {
  return { name, age, role };
}

export function formatAddress({
  zip,
  pref,
  city,
  line = "",
}: {
  zip: string;
  pref: string;
  city: string;
  line?: string;
}): string {
  return `〒${zip} ${pref}${city}${line}`;
}

export function searchQuery({
  keyword,
  limit = 10,
  sort = "new",
}: {
  keyword: string;
  limit?: number;
  sort?: "new" | "popular";
}): string {
  return `q=${encodeURIComponent(keyword)}&limit=${limit}&sort=${sort}`;
}
