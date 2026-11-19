// void の行は、実装前でも引数を使ったことにする仮の行です。実装するときに削除します。

// 会員かどうかを示す真偽値 isMember が true で、注文金額 total（0 円以上の整数）が 5,000 円以上なら true、それ以外は false を返します。
export function canUseMemberDiscount(isMember, total) {
  void isMember;
  void total;
  // ここに書く
  return undefined;
}

// 平日かどうかを示す真偽値 isWeekday と時刻 hour（0〜23 の整数）を受け取ります。
// 平日または 18 時以降の少なくとも一方が成り立てば true、それ以外は false を返します。
export function canSendNotice(isWeekday, hour) {
  void isWeekday;
  void hour;
  // ここに書く
  return undefined;
}

// 窓口が開いているかを示す真偽値 isOpen と空き枠数 slots（0 以上の整数）を受け取ります。
// 閉まっている場合は先に false を返します。
// 開いている場合は空きが 1 枠以上なら true、0 枠なら false です。
export function canAcceptRequest(isOpen, slots) {
  void isOpen;
  void slots;
  // ここに書く
  return undefined;
}

// inputCode と expectedCode は文字列で、expectedCode は空でありません。
// 入力が空文字なら先に null を返します。
// それ以外は文字の並びが同じなら true、異なれば false を返します。
// 空白も文字として扱います。
export function checkPickupCode(inputCode, expectedCode) {
  void inputCode;
  void expectedCode;
  // ここに書く
  return undefined;
}

// 時刻 hour（0〜23 の整数）が 9 時以上かつ 17 時未満なら true、それ以外は false を返します。
// 9 時は受け取れます。
// 17 時には受付が終了します。
export function isPickupHour(hour) {
  void hour;
  // ここに書く
  return undefined;
}

// 利用停止かどうかを示す真偽値 isSuspended、在庫数 stock（0 以上の整数）、取り置き券を持っているかを示す真偽値 hasVoucher を受け取ります。
// 利用停止中は先に false を返します。
// それ以外は在庫が 1 個以上、または取り置き券ありの少なくとも一方が成り立てば true、どちらも成り立たなければ false です。
export function canReserveItem(isSuspended, stock, hasVoucher) {
  void isSuspended;
  void stock;
  void hasVoucher;
  // ここに書く
  return undefined;
}
