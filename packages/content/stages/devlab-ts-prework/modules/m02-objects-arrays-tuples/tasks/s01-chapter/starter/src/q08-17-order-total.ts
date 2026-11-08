// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object
//
// 引数と戻り値には型注釈を付けること。
// キーが自由な文字列で、値の型が決まっているオブジェクトは { [name: string]: number } のようなインデックス型にする。
// scores[name] のように取り出した値は、そのキーがないかもしれないので number | undefined になる。?? や !== undefined で扱う。
// すべてのキーや値を順に見るときは Object.keys、Object.values、Object.entries を使う。オブジェクトを変えるときは、新しいオブジェクトを作って返す。

// 問17 価格表 prices と注文 order（商品ごとの個数）から合計金額を返す。価格表にない商品があれば Error を投げる
//     例: orderTotal({ りんご: 150, みかん: 80 }, { りんご: 2, みかん: 3 }) → 540
export function orderTotal() {}
