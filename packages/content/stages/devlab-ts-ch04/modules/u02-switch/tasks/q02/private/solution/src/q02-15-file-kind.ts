// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問15
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
