// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問15
export type Media =
  { type: "image"; width: number; height: number } | { type: "video"; seconds: number };

export function mediaInfo(media: Media): string {
  return media.type === "image" ? `画像 ${media.width}×${media.height}` : `動画 ${media.seconds}秒`;
}
