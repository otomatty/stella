// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 次の20問を解いてください。引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// 問1〜13 は、引数や戻り値に Named & Aged のようなインターセクション型を書く。
// 問14〜20 は、インターセクション型に type で名前を付けて export し、その型を使って関数を書く。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Named = { name: string };
export type Aged = { age: number };
export type Priced = { price: number };
export type Timestamped = { createdAt: Date };
export type Identified = { id: number };

// 問1 「山田（30）」を返す
//     例: introduce({ name: "山田", age: 30 }) → "山田（30）"
export function introduce() {}

// 問2 name と age から Named & Aged を作る
//     例: makePerson("山田", 30) → { name: "山田", age: 30 }
export function makePerson() {}

// 問3 Named に id を足した Named & Identified を返す
//     例: withId({ name: "山田" }, 3) → { name: "山田", id: 3 }
export function withId() {}

// 問4 Named に createdAt を足した Named & Timestamped を返す
//     例: stamp({ name: "メモ" }, 日時) → { name: "メモ", createdAt: 日時 }
export function stamp() {}

// 問5 「りんご 150円」を返す
//     例: priceTag({ name: "りんご", price: 150 }) → "りんご 150円"
export function priceTag() {}

// 問6 price が limit 以下なら true
//     例: isCheap({ name: "りんご", price: 150 }, 200) → true
export function isCheap() {}

// 問7 name と price から Named & Priced を作る
//     例: makeItem("りんご", 150) → { name: "りんご", price: 150 }
export function makeItem() {}

// 問8 「#3 山田」を返す
//     例: idLabel({ id: 3, name: "山田" }) → "#3 山田"
export function idLabel() {}

// 問9 age を1増やした、新しい Named & Aged を返す
//     例: olderByOne({ name: "山田", age: 30 }) → { name: "山田", age: 31 }
export function olderByOne() {}

// 問10 createdAt を「2026-12-01」の形にする（toISOString の先頭10文字）
//     例: createdDate({ id: 1, createdAt: 日時 }) → "2026-12-01"
export function createdDate() {}

// 問11 name、age、id から Named & Aged & Identified を作る
//     例: makeMember("山田", 30, 1) → { name: "山田", age: 30, id: 1 }
export function makeMember() {}

// 問12 price の合計を返す。引数は readonly (Named & Priced)[]
//     例: totalOf([りんご 150円, みかん 80円]) → 230
export function totalOf() {}

// 問13 いちばん年上の人の name を返す。同じ年齢なら先に出てきた人。空の配列なら Error を投げる
//     例: oldestName([山田 30, 佐藤 45]) → "佐藤"
export function oldestName() {}

// 問14 型 Product を Named & Priced & Identified として定義して export し、productText(product: Product) を書く。「#1 りんご 150円」
//     例: productText({ id: 1, name: "りんご", price: 150 }) → "#1 りんご 150円"
// ここに型 Product と関数 productText を書く

// 問15 型 Member を Named & Aged & { role: "admin" | "member" } として定義して export し、isAdultAdmin(member: Member) を書く。role が admin で18歳以上なら true
//     例: isAdultAdmin({ name: "山田", age: 30, role: "admin" }) → true
// ここに型 Member と関数 isAdultAdmin を書く

// 問16 型 Post を Identified & Timestamped & { title: string } として定義して export し、postTitle(post: Post) を書く。「#1 はじめまして」
//     例: postTitle({ id: 1, createdAt: 日時, title: "はじめまして" }) → "#1 はじめまして"
// ここに型 Post と関数 postTitle を書く

// 問17 型 Draft（{ title: string }）と、型 Published（Draft & { publishedAt: Date }）を定義して export し、publish(draft: Draft, at: Date) を書く。publishedAt を足した Published を返す
//     例: publish({ title: "お知らせ" }, 日時) → { title: "お知らせ", publishedAt: 日時 }
// ここに型 Draft、型 Published と関数 publish を書く

// 問18 型 Tagged を Named & { tags: string[] } として定義して export し、addTag(x: Tagged, tag: string) を書く。tags の末尾に tag を足した、新しい Tagged を返す
//     例: addTag({ name: "メモ", tags: ["a"] }, "b") → { name: "メモ", tags: ["a", "b"] }
// ここに型 Tagged と関数 addTag を書く

// 問19 型 Discounted を Priced & { discount: number } として定義して export し、finalPrice(x: Discounted) を書く。price - discount を返す。0 より小さくはしない
//     例: finalPrice({ price: 1000, discount: 200 }) → 800
// ここに型 Discounted と関数 finalPrice を書く

// 問20 型 Place を Named & { lat: number; lng: number } として定義して export し、place(name: string, lat: number, lng: number) を書く。Place を返す
//     例: place("東京駅", 35.68, 139.76) → { name: "東京駅", lat: 35.68, lng: 139.76 }
// ここに型 Place と関数 place を書く
