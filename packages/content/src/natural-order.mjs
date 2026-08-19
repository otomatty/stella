/**
 * 自然順（numeric sort）の比較関数。
 *
 * モジュール / レッスン / トピックの **並び = 学習順** は、ディレクトリ名の
 * ソート結果で決まる。単純な辞書順だと `m10-mock-exam` が `m1-foundations` と
 * `m2-computer-systems` の間に割り込み、10 個目のモジュールを最後に置けない。
 * 名前の中の数字を数値として比べることで、`m9` → `m10` の順になる。
 *
 * 数字の桁数が揃っている名前どうし（`m0`〜`m9` 運用の既存講座がそう）では
 * 辞書順とまったく同じ結果になるので、並びは変わらない。
 *
 * TypeScript ではなく `.mjs` なのは、node で直接動く `scripts/*.mjs` と、tsc に
 * 通る `src/*.ts` の両方から同じ 1 つの実装を使うため（型は natural-order.d.mts）。
 */

/** 数字の連なりと、それ以外の連なりに切り分ける。 */
function chunks(value) {
  return value.match(/\d+|\D+/g) ?? [];
}

function isDigits(chunk) {
  const code = chunk.charCodeAt(0);
  return code >= 48 && code <= 57;
}

/**
 * `Array#sort` に渡す比較関数。数字の連なりは数値として、それ以外は
 * コードポイント順（= 既定の `sort()` と同じ）で比べる。
 */
export function compareNatural(a, b) {
  if (a === b) return 0;
  const left = chunks(a);
  const right = chunks(b);
  const shared = Math.min(left.length, right.length);

  for (let i = 0; i < shared; i++) {
    const x = left[i];
    const y = right[i];
    if (x === y) continue;
    if (isDigits(x) && isDigits(y)) {
      const nx = Number(x);
      const ny = Number(y);
      if (nx !== ny) return nx < ny ? -1 : 1;
      // 数値が同じで文字列が違うのは前置ゼロの差だけ。`01` を `1` より前に置いて
      // 順序を一意に決める（同値を返すと sort が不安定になる）。
      return x.length > y.length ? -1 : 1;
    }
    return x < y ? -1 : 1;
  }

  if (left.length === right.length) return 0;
  return left.length < right.length ? -1 : 1;
}

/** 自然順に並べた新しい配列を返す。 */
export function sortNatural(values) {
  return [...values].sort(compareNatural);
}
