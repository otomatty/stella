// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 定数と関数は定義済みです（書き換えない）。
// 型の位置で typeof 定数 と書くと、その定数の型になる。(typeof 配列)[number] で配列の要素の型、(typeof オブジェクト)["キー"] でプロパティの型を取り出せる。
// 型を書く問題は、型を手で書き写さず、必ず typeof を使って作ること（値を直したときに型も変わるように）。
// 関数を書く問題は、引数と戻り値に型注釈を付けること。型注釈にも typeof を使う。

export function makeItem(name: string, price: number) {
  return { name, price, createdAt: 0 };
}

// 問12 型 Item を、関数 makeItem の戻り値の型として作る（ReturnType<typeof makeItem>）
// ここに型 Item を書く
