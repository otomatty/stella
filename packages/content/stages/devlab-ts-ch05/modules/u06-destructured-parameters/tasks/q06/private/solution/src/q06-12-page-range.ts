// 問12 { page, perPage } から { offset, limit } を返す。offset は (page - 1) × perPage。page を省略したら 1、perPage を省略したら 10
//     例: pageRange({ page: 3 }) → { offset: 20, limit: 10 }
// 引数と戻り値には型注釈を付けてください。
// オブジェクトは引数の位置で分割代入してください。
// 省略できるプロパティには型で ? を付け、分割代入でデフォルト値を指定してください。

export function pageRange({ page = 1, perPage = 10 }: { page?: number; perPage?: number }): {
  offset: number;
  limit: number;
} {
  return { offset: (page - 1) * perPage, limit: perPage };
}
