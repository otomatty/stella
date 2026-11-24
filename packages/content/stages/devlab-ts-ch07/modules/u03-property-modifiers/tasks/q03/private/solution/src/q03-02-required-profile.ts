// 問2 型 RequiredProfile を Profile から作る（すべて省略できない）
// プロパティを手で書き並べず、Required<Profile> で作ります。

export type Profile = { name: string; email?: string; age?: number };

export type RequiredProfile = Required<Profile>;
