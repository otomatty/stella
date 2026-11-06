// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 次の20問を解いてください。引数と戻り値には型注釈を付けること。
// 問1〜11 は、定義済みの型 Shape、Payment、Notice を使う。kind や method のような共通のプロパティで、どの形かを見分けてから使う。
// 問12〜20 は、判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

// 問1 面積を返す。円は Math.PI × 半径 × 半径
//     例: shapeArea({ kind: "square", size: 3 }) → 9
export function shapeArea() {}

// 問2 図形の名前を返す。"円" | "正方形" | "長方形"
//     例: shapeName({ kind: "circle", radius: 1 }) → "円"
export function shapeName() {}

// 問3 周りの長さを返す。円は 2 × Math.PI × 半径
//     例: shapePerimeter({ kind: "rect", width: 2, height: 3 }) → 10
export function shapePerimeter() {}

// 問4 円なら true
//     例: isRound({ kind: "circle", radius: 1 }) → true
export function isRound() {}

// 問5 大きさを k 倍した、新しい図形を返す
//     例: scaleShape({ kind: "square", size: 3 }, 2) → { kind: "square", size: 6 }
export function scaleShape() {}

// 問6 支払い方法を表示する。cash は「現金」、card は「カード（末尾1234）」、bank は「振込（◯◯銀行）」
//     例: paymentLabel({ method: "card", cardNumber: "4111111111111234" }) → "カード（末尾1234）"
export function paymentLabel() {}

// 問7 card か bank なら true（確認が要る）
//     例: needsConfirmation({ method: "cash" }) → false
export function needsConfirmation() {}

// 問8 card ならカード番号の末尾4桁、それ以外は undefined を返す
//     例: lastFour({ method: "card", cardNumber: "4111111111111234" }) → "1234"
export function lastFour() {}

// 問9 お知らせを表示する。info は「[情報] 本文」、warning は「[注意Lv2] 本文」、error は「[エラー500] 本文」
//     例: noticeText({ type: "info", message: "更新しました" }) → "[情報] 更新しました"
export function noticeText() {}

// 問10 error なら true。warning は level が 3 以上なら true。info は false
//     例: isSerious({ type: "warning", message: "x", level: 3 }) → true
export function isSerious() {}

// 問11 error なら code、それ以外は undefined を返す
//     例: errorCode({ type: "error", message: "x", code: 404 }) → 404
export function errorCode() {}

// 問12 型 Animal（{ kind: "dog"; name } か { kind: "cat"; name }）を定義して export し、cry(animal: Animal) を書く。「ポチ: ワン」「ミケ: ニャー」
//     例: cry({ kind: "dog", name: "ポチ" }) → "ポチ: ワン"
// ここに型 Animal と関数 cry を書く

// 問13 型 Vehicle（{ type: "car"; seats } か { type: "bike" }）を定義して export し、capacity(vehicle: Vehicle) を書く。car は seats、bike は 1
//     例: capacity({ type: "bike" }) → 1
// ここに型 Vehicle と関数 capacity を書く

// 問14 型 UserAction（{ kind: "click"; x; y } か { kind: "key"; key }）を定義して export し、actionText(event: UserAction) を書く。「click(10, 20)」「key(Enter)」
//     例: actionText({ kind: "key", key: "Enter" }) → "key(Enter)"
// ここに型 UserAction と関数 actionText を書く

// 問15 型 Media（{ type: "image"; width; height } か { type: "video"; seconds }）を定義して export し、mediaInfo(media: Media) を書く。「画像 100×200」「動画 90秒」
//     例: mediaInfo({ type: "video", seconds: 90 }) → "動画 90秒"
// ここに型 Media と関数 mediaInfo を書く

// 問16 型 ApiResponse（{ ok: true; data: string } か { ok: false; status: number }）を定義して export し、responseText(response: ApiResponse) を書く。成功なら data、失敗なら「エラー 404」
//     例: responseText({ ok: false, status: 404 }) → "エラー 404"
// ここに型 ApiResponse と関数 responseText を書く

// 問17 型 Account（{ plan: "free" } か { plan: "paid"; until: string }）を定義して export し、accountText(account: Account) を書く。「無料」「有料（2026-12-31まで）」
//     例: accountText({ plan: "paid", until: "2026-12-31" }) → "有料（2026-12-31まで）"
// ここに型 Account と関数 accountText を書く

// 問18 型 Token（{ type: "number"; value } か { type: "plus" } か { type: "minus" }）を定義して export し、tokenText(token: Token) を書く。number は数字、plus は "+"、minus は "-"
//     例: tokenText({ type: "plus" }) → "+"
// ここに型 Token と関数 tokenText を書く

// 問19 型 Contact（{ by: "email"; address } か { by: "phone"; number }）を定義して export し、contactText(contact: Contact) を書く。「メール: a@example.com」「電話: 090-…」
//     例: contactText({ by: "email", address: "a@example.com" }) → "メール: a@example.com"
// ここに型 Contact と関数 contactText を書く

// 問20 型 Reading（{ unit: "C"; value } か { unit: "F"; value }）を定義して export し、toCelsius(reading: Reading) を書く。摂氏にして小数第1位までに四捨五入（F は (value - 32) × 5 ÷ 9）
//     例: toCelsius({ unit: "F", value: 212 }) → 100
// ここに型 Reading と関数 toCelsius を書く
