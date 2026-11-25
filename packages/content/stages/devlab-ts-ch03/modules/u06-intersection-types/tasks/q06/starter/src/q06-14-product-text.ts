// 問14 型 Product を Named & Priced & Identified として定義して export し、productText(product: Product) を書く。「#1 りんご 150円」
//     例: productText({ id: 1, name: "りんご", price: 150 }) → "#1 りんご 150円"
// 引数と戻り値に型注釈を付ける。
// type を使って、& でつないだ型に名前を付ける。

export type Named = { name: string };

export type Priced = { price: number };

export type Identified = { id: number };

// ここに型 Product と関数 productText を書く
