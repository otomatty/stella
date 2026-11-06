export type User = { id: number; name: string; age: number };

const USERS: User[] = [
  { id: 1, name: "山田", age: 34 },
  { id: 2, name: "佐藤", age: 19 },
  { id: 3, name: "鈴木", age: 52 },
  { id: 4, name: "田中", age: 20 },
];

// id のユーザーを取得する。いなければ失敗する
export function fetchUser(id: number): Promise<User> {
  const user = USERS.find((u) => u.id === id);
  return user === undefined
    ? Promise.reject(new Error(`ユーザー ${id} はいません`))
    : Promise.resolve(user);
}

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 問1
export async function getAge(id: number): Promise<number> {
  const user = await fetchUser(id);
  return user.age;
}

// 問2
export async function getName(id: number): Promise<string> {
  const user = await fetchUser(id);
  return user.name;
}

// 問3
export async function isAdult(id: number): Promise<boolean> {
  const user = await fetchUser(id);
  return user.age >= 20;
}

// 問4
export async function greetUser(id: number): Promise<string> {
  const user = await fetchUser(id);
  return `こんにちは、${user.name}さん`;
}

// 問5
export const nameLength = async (id: number): Promise<number> => {
  const user = await fetchUser(id);
  return user.name.length;
};

// 問6
export async function ageAfter(id: number, years: number): Promise<number> {
  const user = await fetchUser(id);
  return user.age + years;
}

// 問7
export async function sumAges(a: number, b: number): Promise<number> {
  const first = await fetchUser(a);
  const second = await fetchUser(b);
  return first.age + second.age;
}

// 問8
export async function sumAgesAtOnce(a: number, b: number): Promise<number> {
  const [first, second] = await Promise.all([fetchUser(a), fetchUser(b)]);
  return first.age + second.age;
}

// 問9
export async function namesInOrder(ids: readonly number[]): Promise<string[]> {
  const names: string[] = [];
  for (const id of ids) {
    const user = await fetchUser(id);
    names.push(user.name);
  }
  return names;
}

// 問10
export async function namesAtOnce(ids: readonly number[]): Promise<string[]> {
  const users = await Promise.all(ids.map((id) => fetchUser(id)));
  return users.map((u) => u.name);
}

// 問11
export async function oldestName(ids: readonly number[]): Promise<string | undefined> {
  const users = await Promise.all(ids.map((id) => fetchUser(id)));
  let oldest: User | undefined;
  for (const user of users) {
    if (oldest === undefined || user.age > oldest.age) {
      oldest = user;
    }
  }
  return oldest?.name;
}

// 問12
export async function averageAge(ids: readonly number[]): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }
  const users = await Promise.all(ids.map((id) => fetchUser(id)));
  return users.reduce((sum, u) => sum + u.age, 0) / users.length;
}

// 問13
export async function safeName(id: number): Promise<string> {
  try {
    const user = await fetchUser(id);
    return user.name;
  } catch {
    return "不明";
  }
}

// 問14
export async function userExists(id: number): Promise<boolean> {
  try {
    await fetchUser(id);
    return true;
  } catch {
    return false;
  }
}

// 問15
export async function countFound(ids: readonly number[]): Promise<number> {
  let count = 0;
  for (const id of ids) {
    try {
      await fetchUser(id);
      count += 1;
    } catch {
      // いない id は数えない
    }
  }
  return count;
}

// 問16
export async function firstAdult(ids: readonly number[]): Promise<string | undefined> {
  for (const id of ids) {
    try {
      const user = await fetchUser(id);
      if (user.age >= 20) {
        return user.name;
      }
    } catch {
      // いない id は飛ばす
    }
  }
  return undefined;
}

// 問17
export async function waitAndReturn(ms: number, value: string): Promise<string> {
  await wait(ms);
  return value;
}

// 問18
export async function runInOrder(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  const results: string[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

// 問19
export async function runAtOnce(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  return await Promise.all(tasks.map((task) => task()));
}

// 問20
export async function untilFailure(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  const results: string[] = [];
  for (const task of tasks) {
    try {
      results.push(await task());
    } catch {
      break;
    }
  }
  return results;
}
