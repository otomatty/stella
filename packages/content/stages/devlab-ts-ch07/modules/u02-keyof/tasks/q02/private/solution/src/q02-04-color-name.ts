// 問4 型 ColorName を、定数 COLOR_CODES のキーとして作る
// キーの型は手で書き並べず、keyof typeof COLOR_CODES で作ります。

export const COLOR_CODES = { red: "#ff0000", green: "#00ff00", blue: "#0000ff" } as const;

export type ColorName = keyof typeof COLOR_CODES;
