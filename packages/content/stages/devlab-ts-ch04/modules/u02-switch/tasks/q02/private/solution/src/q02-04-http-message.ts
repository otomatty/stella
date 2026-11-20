// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問4
export function httpMessage(code: number): string {
  switch (code) {
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 404:
      return "Not Found";
    case 500:
      return "Internal Server Error";
    default:
      return "Unknown";
  }
}
