// 問4 200 は "OK"、201 は "Created"、404 は "Not Found"、500 は "Internal Server Error"、それ以外は "Unknown"
//     例: httpMessage(404) → "Not Found"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// どの case にも当てはまらない値は default で扱います。
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
