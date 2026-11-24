// 問4 型 ReadonlyProfile を Profile から作る
// プロパティを手で書き並べず、Readonly<Profile> で作ります。

export type Profile = { name: string; email?: string; age?: number };

// ここに型 ReadonlyProfile を書く
