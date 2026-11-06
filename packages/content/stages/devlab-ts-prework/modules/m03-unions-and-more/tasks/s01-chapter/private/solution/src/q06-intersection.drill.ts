export type Named = { name: string };
export type Aged = { age: number };
export type Priced = { price: number };
export type Timestamped = { createdAt: Date };
export type Identified = { id: number };

// 問1
export function introduce(person: Named & Aged): string {
  return `${person.name}（${person.age}）`;
}

// 問2
export function makePerson(name: string, age: number): Named & Aged {
  return { name, age };
}

// 問3
export function withId(x: Named, id: number): Named & Identified {
  return { ...x, id };
}

// 問4
export function stamp(x: Named, createdAt: Date): Named & Timestamped {
  return { ...x, createdAt };
}

// 問5
export function priceTag(item: Named & Priced): string {
  return `${item.name} ${item.price}円`;
}

// 問6
export function isCheap(item: Named & Priced, limit: number): boolean {
  return item.price <= limit;
}

// 問7
export function makeItem(name: string, price: number): Named & Priced {
  return { name, price };
}

// 問8
export function idLabel(x: Named & Identified): string {
  return `#${x.id} ${x.name}`;
}

// 問9
export function olderByOne(person: Named & Aged): Named & Aged {
  return { ...person, age: person.age + 1 };
}

// 問10
export function createdDate(x: Identified & Timestamped): string {
  return x.createdAt.toISOString().slice(0, 10);
}

// 問11
export function makeMember(name: string, age: number, id: number): Named & Aged & Identified {
  return { name, age, id };
}

// 問12
export function totalOf(items: readonly (Named & Priced)[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}

// 問13
export function oldestName(people: readonly (Named & Aged)[]): string {
  const [first, ...rest] = people;
  if (first === undefined) {
    throw new Error("空の配列です");
  }
  let oldest = first;
  for (const person of rest) {
    if (person.age > oldest.age) {
      oldest = person;
    }
  }
  return oldest.name;
}

// 問14
export type Product = Named & Priced & Identified;

export function productText(product: Product): string {
  return `#${product.id} ${product.name} ${product.price}円`;
}

// 問15
export type Member = Named & Aged & { role: "admin" | "member" };

export function isAdultAdmin(member: Member): boolean {
  return member.role === "admin" && member.age >= 18;
}

// 問16
export type Post = Identified & Timestamped & { title: string };

export function postTitle(post: Post): string {
  return `#${post.id} ${post.title}`;
}

// 問17
export type Draft = { title: string };
export type Published = Draft & { publishedAt: Date };

export function publish(draft: Draft, at: Date): Published {
  return { ...draft, publishedAt: at };
}

// 問18
export type Tagged = Named & { tags: string[] };

export function addTag(x: Tagged, tag: string): Tagged {
  return { ...x, tags: [...x.tags, tag] };
}

// 問19
export type Discounted = Priced & { discount: number };

export function finalPrice(x: Discounted): number {
  return Math.max(x.price - x.discount, 0);
}

// 問20
export type Place = Named & { lat: number; lng: number };

export function place(name: string, lat: number, lng: number): Place {
  return { name, lat, lng };
}
