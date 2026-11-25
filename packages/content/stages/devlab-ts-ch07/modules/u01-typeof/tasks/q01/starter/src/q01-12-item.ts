// 問12 型 Item を、関数 makeItem の戻り値の型として作る（ReturnType<typeof makeItem>）
// 定義済みの関数は書き換えません。

export function makeItem(name: string, price: number) {
  return { name, price, createdAt: 0 };
}

// ここに型 Item を書く
