// 問15 型 Media（{ type: "image"; width; height } か { type: "video"; seconds }）を定義して export し、mediaInfo(media: Media) を書く。「画像 100×200」「動画 90秒」
//     例: mediaInfo({ type: "video", seconds: 90 }) → "動画 90秒"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type Media =
  { type: "image"; width: number; height: number } | { type: "video"; seconds: number };

export function mediaInfo(media: Media): string {
  return media.type === "image" ? `画像 ${media.width}×${media.height}` : `動画 ${media.seconds}秒`;
}
