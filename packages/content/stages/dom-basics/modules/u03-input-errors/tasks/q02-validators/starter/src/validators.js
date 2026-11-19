// void の行は、実装前でも引数を使ったことにする仮の行です。実装するときに削除します。

// 前後の空白を除いて空なら必須入力のエラー文を返します。
// 問題がなければ空文字を返します。
export function validateRequired(value) {
  void value;
  // ここに書く
  return undefined;
}

// 10 文字を超えたら最大文字数のエラー文を返します。空白も数えます。
// 問題がなければ空文字を返します。
export function validateLength(value) {
  void value;
  // ここに書く
  return undefined;
}

// 空欄か、数値に変換した結果が 1〜10 の整数でなければ数量のエラー文を返します。
// 問題がなければ空文字を返します。
export function validateQuantity(value) {
  void value;
  // ここに書く
  return undefined;
}

// @ を含まなければメールのエラー文を返します。
// 問題がなければ空文字を返します。
export function validateEmail(value) {
  void value;
  // ここに書く
  return undefined;
}

// 2 つの文字列が完全に一致しなければ確認用のエラー文を返します。
// 問題がなければ空文字を返します。
export function validateConfirmation(value, confirmation) {
  void value;
  void confirmation;
  // ここに書く
  return undefined;
}

// 半角数字ちょうど 7 桁でなければ郵便番号のエラー文を返します。
// 問題がなければ空文字を返します。
export function validatePostalCode(value) {
  void value;
  // ここに書く
  return undefined;
}
