/**
 * 生成 JS の先頭に差し込む擬似言語ランタイム (#133)。
 *
 * ここが「TypeScript 翻訳版では学べない部分」を吸収する層:
 *
 * - **配列の添字は 1 から始まる**。 `__feIdx` / `__feSet` が 1 起点 ⇔ 0 起点を変換し、
 *   範囲外は日本語のエラーにする (科目B の頻出の引っかけどころなので、
 *   黙って `undefined` を返さず必ず落とす)。
 * - **整数同士の除算は商 (切り捨て)**。 擬似言語の仕様どおり、 両辺が整数のときだけ
 *   `Math.trunc` する。 実数が混じれば通常の除算に戻る。
 *
 * QuickJS の `console` は `log` だけを差し替えたオブジェクトで、 `function` 採点の
 * ときは差し替え自体が無い。 `__feOut` は console の有無を見てから呼ぶ。
 */

export const FE_PSEUDO_RUNTIME = `
var __feBuiltinArray = Array;
var __feBuiltinNumber = Number;
var __feBuiltinMath = Math;
var __feBuiltinConsole = typeof console !== "undefined" ? console : undefined;
function __feCheckArray(a, what) {
  if (!__feBuiltinArray.isArray(a)) {
    throw new Error(what + "できるのは配列だけです");
  }
  return a;
}
function __feLen(a) {
  return __feCheckArray(a, "要素数を取得").length;
}
function __feIdx(a, i) {
  __feCheckArray(a, "添字でアクセス");
  if (!__feBuiltinNumber.isInteger(i) || i < 1 || i > a.length) {
    throw new Error(
      "配列の範囲外アクセスです (添字: " + i + ", 要素数: " + a.length +
        ")。擬似言語の配列の添字は 1 から始まります"
    );
  }
  return a[i - 1];
}
function __feSet(a, i, v) {
  __feCheckArray(a, "添字でアクセス");
  if (!__feBuiltinNumber.isInteger(i) || i < 1 || i > a.length) {
    throw new Error(
      "配列の範囲外アクセスです (添字: " + i + ", 要素数: " + a.length +
        ")。擬似言語の配列の添字は 1 から始まります"
    );
  }
  a[i - 1] = v;
  return v;
}
function __feDiv(a, b) {
  if (b === 0) {
    throw new Error("0 で除算しました");
  }
  var r = a / b;
  return __feBuiltinNumber.isInteger(a) && __feBuiltinNumber.isInteger(b)
    ? __feBuiltinMath.trunc(r)
    : r;
}
function __feRealDiv(a, b) {
  if (b === 0) {
    throw new Error("0 で除算しました");
  }
  return a / b;
}
function __feMod(a, b) {
  if (b === 0) {
    throw new Error("0 で剰余を求めました");
  }
  return a % b;
}
function __feOut() {
  var args = __feBuiltinArray.prototype.slice.call(arguments);
  if (__feBuiltinConsole && typeof __feBuiltinConsole.log === "function") {
    __feBuiltinConsole.log.apply(__feBuiltinConsole, args);
  }
}
`;
