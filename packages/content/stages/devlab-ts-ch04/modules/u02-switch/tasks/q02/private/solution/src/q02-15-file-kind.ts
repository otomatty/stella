// 問15 拡張子 "png"、"jpg"、"gif" は "画像"、"mp4"、"mov" は "動画"、"pdf"、"docx" は "文書"、それ以外は "その他"
//     例: fileKind("jpg") → "画像"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// 同じ処理になる case は続けて並べます。
// どの case にも当てはまらない値は default で扱います。
export function fileKind(extension: string): "画像" | "動画" | "文書" | "その他" {
  switch (extension) {
    case "png":
    case "jpg":
    case "gif":
      return "画像";
    case "mp4":
    case "mov":
      return "動画";
    case "pdf":
    case "docx":
      return "文書";
    default:
      return "その他";
  }
}
