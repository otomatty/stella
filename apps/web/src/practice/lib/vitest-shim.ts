/**
 * Vitest 風テスト API のシム (#110)。
 *
 * QuickJS ランタイム内に注入される文字列として export する。
 * Vitest / Jest 互換のサブセットを提供し、 学習者は `describe` / `it` / `expect` で
 * テストを書ける。 シムはクロージャ内に閉じ込めた `records` (TestRecord[]) に各 `it` の
 * 結果を蓄積し、 ランナー側が末尾で呼び出す emit 関数経由でレポート行を出力する。
 *
 * 提供 API:
 * - `describe(name, fn)` … その場で fn() を実行する (グルーピングのみ)。
 * - `it(name, fn)` / `test(name, fn)` … fn を try/catch で実行し結果を records へ push。
 * - `expect(actual)`: `.toBe`, `.toEqual`, `.toStrictEqual`, `.toBeTruthy`, `.toBeFalsy`,
 *   `.toBeNull`, `.toBeUndefined`, `.toBeDefined`, `.toBeCloseTo`,
 *   `.toBeGreaterThan/.toBeLessThan/.toBeGreaterThanOrEqual/.toBeLessThanOrEqual`,
 *   `.toContain`, `.toHaveLength`, `.toThrow`, `.not.<同上>`
 *
 * Vitest との挙動差 (教材用に意図的に簡略化したもの):
 * - `toStrictEqual` は `toEqual` の単純なエイリアス。 本来の Vitest は
 *   プロトタイプ一致や `undefined` を含むキー差まで厳密比較するが、 学習教材では
 *   両者を区別する必要が薄いため共通化している。 厳密な型比較を学ぶ段階の課題では
 *   `.toBe` (Object.is) を使う前提。
 *
 * 非対応 (v1):
 * - async テスト (戻り値が Promise の `it`) は明示エラー扱い ("async tests not supported")。
 *   QuickJS の `runFreeRun` がプロミス解決を待たないため、 確定的な結果が得られないため。
 * - `beforeEach` / `afterEach` / モック (`vi.fn()`) / snapshot。 学習目的では未提供。
 *
 * セキュリティ:
 * - `records` は IIFE のクロージャに閉じ込めており、 学習者コードから直接読み書きできない
 *   (codereview: globalThis 露出経由の偽結果注入を防ぐ)。
 * - レポート行は呼び出しごとにランナーが生成する nonce (16 byte の hex) を含む。
 *   学習者が事前に偽レポート行を console.log で出しても nonce が一致しないため runner は無視する
 *   (codereview: stdout の「最後の prefix 行」 を信用する設計の穴を塞ぐ)。
 * - emit 関数は `Object.defineProperty` で writable/configurable: false にしており、
 *   学習者からの上書き・削除を防ぐ (代入は非 strict で no-op、 strict で例外)。
 */

export interface VitestTestRecord {
  name: string;
  passed: boolean;
  /** fail / async / 内部例外の人読み文言。 passed=true なら省略。 */
  error?: string;
}

/**
 * レポート行の固定 prefix。 nonce はこの後ろに連結されるため、
 * stdout からは `__JSREVIEW_VITEST_REPORT__:<nonce>:<json>` の形式になる。
 */
export const VITEST_REPORT_PREFIX = "__JSREVIEW_VITEST_REPORT__:";

/** emit 関数の globalThis 上の名前。 学習者から見えるが値を上書きできない (defineProperty)。 */
export const VITEST_EMIT_GLOBAL = "__jsreview_vitest_emit__";

/**
 * 偽造を防ぐためのランダム nonce を生成する。
 * crypto.getRandomValues は QuickJS でも利用可能 (web-crypto polyfill 経由)。 利用できない
 * 環境では Math.random で fallback する (学習者教材では十分な entropy)。
 */
function generateNonce(): string {
  const cryptoApi: { getRandomValues?: (a: Uint8Array) => Uint8Array } | undefined =
    typeof crypto !== "undefined" ? (crypto as { getRandomValues?: (a: Uint8Array) => Uint8Array }) : undefined;
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const arr = new Uint8Array(16);
    cryptoApi.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // crypto が無いケースは現状の Vite + browser + bun では発生しないが、 fallback として
  // Math.random を 2 回連結。 30 文字程度なので推測困難。
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

/**
 * QuickJS に注入するシム本体を生成する。
 *
 * `nonce` は呼び出しごとに変化するため、 シム source も呼び出しごとに生成する。
 * (シム source 末尾の emit 関数が nonce を closure 経由で保持し、 ランナー側は
 *  自分が生成した nonce と一致する行だけを採点に使う)
 */
function buildVitestShim(nonce: string): string {
  // 文字列定数は JSON.stringify で安全にエスケープ
  const prefixWithNonce = `${VITEST_REPORT_PREFIX}${nonce}:`;
  return `
;(function (__jsreview_log_inj__) {
  if (globalThis.${VITEST_EMIT_GLOBAL}) { return; }
  // fullPrefix はクロージャ内に閉じ込め、 学習者コードから直接書き換え不可。
  const fullPrefix = ${JSON.stringify(prefixWithNonce)};

  // 学習者が後から console.log を上書きしてレポートを傍受・偽造する経路を塞ぐため、
  // ログ関数の参照をシム読み込み時にクロージャへ捕獲する (codex P1 / coderabbit critical)。
  // 引数 __jsreview_log_inj__ には buildScenarioCode が \`globalThis.__jsreview_log__\` を
  // 渡しており、 学習者 top-level の \`function __jsreview_log__\` 宣言は外側 IIFE スコープに
  // 限定されるため、 この引数は必ず runner 注入の関数 (もしくは undefined) になる。
  const safeLog = (function () {
    if (typeof __jsreview_log_inj__ === "function") { return __jsreview_log_inj__; }
    try {
      const cl = console.log;
      return cl.bind(console);
    } catch (_) { /* ignore */ }
    return function () { /* no-op */ };
  })();

  // JSON.stringify / String も学習者が後から差し替えできるので、 シム読み込み時に
  // bind / 参照を固定する (codex P1 / coderabbit critical)。
  // 注: JSON.stringify.bind だけでは Array.prototype.toJSON や Object.prototype.toJSON の
  // 汚染で内容を改竄できる。 そのため records は **配列に貯めず、 都度 JSON 文字列を
  // 連結する** 設計 (下記 recordsJson)。 JSON.stringify は string primitive にのみ使い、
  // primitives は仕様上 toJSON を呼ばないため安全。
  const _String = String;
  const _stringify = (function () {
    try { return JSON.stringify.bind(JSON); } catch (_) { return null; }
  })();

  // 累積シリアライズ: records を Array で持つと Array.prototype.toJSON 汚染で
  // emit 時に偽の JSON を返される。 each it / describe で即 JSON 文字列化して連結する
  // ことで、 emit 時点ではただの文字列結合だけになり toJSON 経由の改竄を完全に防ぐ。
  let recordCount = 0;
  let recordsJson = "";
  function pushRecord(name, passed, error) {
    if (!_stringify) { return; }
    if (recordCount > 0) { recordsJson += ","; }
    recordCount += 1;
    // _stringify(_String(x)) は string primitive 化してから JSON 化するので、
    // Object/Array prototype の toJSON 汚染を踏まない (string primitives は toJSON 不適用)。
    let item = "{\\"name\\":" + _stringify(_String(name));
    item += ",\\"passed\\":" + (passed ? "true" : "false");
    if (error !== undefined) {
      item += ",\\"error\\":" + _stringify(_String(error));
    }
    item += "}";
    recordsJson += item;
  }

  globalThis.describe = function (name, fn) {
    if (typeof fn !== "function") {
      pushRecord(_String(name), false, "describe: callback is not a function");
      return;
    }
    try {
      fn();
    } catch (e) {
      pushRecord(_String(name) + " (describe)", false, errMsg(e));
    }
  };

  function runIt(name, fn) {
    const label = _String(name);
    if (typeof fn !== "function") {
      pushRecord(label, false, "it: callback is not a function");
      return;
    }
    try {
      const out = fn();
      if (out && typeof out.then === "function") {
        // QuickJS の runFreeRun はトップレベル await や Promise の解決を待たないため、
        // async テストの結果は確定的に取れない。 v1 では明示エラー扱い。
        pushRecord(label, false, "async tests are not supported in this runner");
        return;
      }
      pushRecord(label, true);
    } catch (e) {
      pushRecord(label, false, errMsg(e));
    }
  }
  globalThis.it = runIt;
  globalThis.test = runIt;

  function errMsg(e) {
    if (e && typeof e === "object" && "message" in e) { return _String(e.message); }
    return _String(e);
  }

  function fmt(v) {
    if (v === undefined) { return "undefined"; }
    if (v === null) { return "null"; }
    if (typeof v === "function") { return "[Function " + (v.name || "anonymous") + "]"; }
    if (typeof v === "string") { return JSON.stringify(v); }
    if (typeof v === "object") {
      try { return JSON.stringify(v); } catch (_) { return String(v); }
    }
    return String(v);
  }

  function deepEqual(a, b) {
    // 公開 API。 循環参照を抱えたオブジェクトでも infinite recursion で stack overflow に
    // ならないよう WeakMap で訪問済みペアを記録しながら比較する (coderabbit nitpick)。
    return _deepEqualSeen(a, b, new WeakMap());
  }

  function _deepEqualSeen(a, b, seen) {
    if (Object.is(a, b)) { return true; }
    if (typeof a !== typeof b) { return false; }
    if (a === null || b === null) { return a === b; }
    if (typeof a !== "object") { return false; }
    // Date / RegExp は Object.keys が空を返すため、 値ベース比較を先に行う必要がある。
    // それ以外の組み込み型 (Map / Set 等) は学習教材では使わない想定で未対応。
    if (a instanceof Date || b instanceof Date) {
      return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    }
    if (a instanceof RegExp || b instanceof RegExp) {
      return a instanceof RegExp && b instanceof RegExp && a.toString() === b.toString();
    }
    if (Array.isArray(a) !== Array.isArray(b)) { return false; }
    // 循環検出: 以前 a を比較したときに同じ b と組み合わせていれば、 一貫性 (= 等しい) と
    // 仮定して再帰を止める。 Jest/Vitest の equals と同じ bisimulation 風の処理。
    if (seen.has(a)) { return seen.get(a) === b; }
    seen.set(a, b);
    if (Array.isArray(a)) {
      if (a.length !== b.length) { return false; }
      for (let i = 0; i < a.length; i++) {
        if (!_deepEqualSeen(a[i], b[i], seen)) { return false; }
      }
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) { return false; }
    for (const k of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) { return false; }
      if (!_deepEqualSeen(a[k], b[k], seen)) { return false; }
    }
    return true;
  }

  function buildMatchers(actual, negate) {
    function assert(cond, msg) {
      const ok = negate ? !cond : cond;
      if (!ok) { throw new Error((negate ? "not." : "") + msg); }
    }
    const m = {
      toBe: function (expected) {
        assert(Object.is(actual, expected), "toBe: expected " + fmt(expected) + " but got " + fmt(actual));
      },
      toEqual: function (expected) {
        assert(deepEqual(actual, expected), "toEqual: expected " + fmt(expected) + " but got " + fmt(actual));
      },
      toStrictEqual: function (expected) {
        assert(deepEqual(actual, expected), "toStrictEqual: expected " + fmt(expected) + " but got " + fmt(actual));
      },
      toBeTruthy: function () {
        assert(Boolean(actual), "toBeTruthy: got " + fmt(actual));
      },
      toBeFalsy: function () {
        assert(!actual, "toBeFalsy: got " + fmt(actual));
      },
      toBeNull: function () {
        assert(actual === null, "toBeNull: got " + fmt(actual));
      },
      toBeUndefined: function () {
        assert(actual === undefined, "toBeUndefined: got " + fmt(actual));
      },
      toBeDefined: function () {
        assert(actual !== undefined, "toBeDefined: got undefined");
      },
      toBeNaN: function () {
        assert(typeof actual === "number" && actual !== actual, "toBeNaN: got " + fmt(actual));
      },
      toBeCloseTo: function (expected, decimals) {
        const d = decimals == null ? 2 : decimals;
        const ok = typeof actual === "number" && typeof expected === "number" &&
          Math.abs(actual - expected) < Math.pow(10, -d) / 2;
        assert(ok, "toBeCloseTo: expected close to " + fmt(expected) + " but got " + fmt(actual));
      },
      toBeGreaterThan: function (n) {
        assert(actual > n, "toBeGreaterThan: expected > " + fmt(n) + " but got " + fmt(actual));
      },
      toBeLessThan: function (n) {
        assert(actual < n, "toBeLessThan: expected < " + fmt(n) + " but got " + fmt(actual));
      },
      toBeGreaterThanOrEqual: function (n) {
        assert(actual >= n, "toBeGreaterThanOrEqual: expected >= " + fmt(n) + " but got " + fmt(actual));
      },
      toBeLessThanOrEqual: function (n) {
        assert(actual <= n, "toBeLessThanOrEqual: expected <= " + fmt(n) + " but got " + fmt(actual));
      },
      toContain: function (v) {
        let ok = false;
        if (typeof actual === "string") { ok = actual.indexOf(String(v)) >= 0; }
        else if (Array.isArray(actual)) {
          for (let i = 0; i < actual.length; i++) {
            if (Object.is(actual[i], v) || deepEqual(actual[i], v)) { ok = true; break; }
          }
        }
        assert(ok, "toContain: expected " + fmt(actual) + " to contain " + fmt(v));
      },
      toHaveLength: function (n) {
        const got = actual == null ? undefined : actual.length;
        assert(got === n, "toHaveLength: expected length " + fmt(n) + " but got " + fmt(got));
      },
      toThrow: function (matcher) {
        if (typeof actual !== "function") {
          // toThrow は actual 側が関数でないと比較不能。 .not でも同じく無効。
          throw new Error("toThrow: actual must be a function");
        }
        let threw = false; let err;
        try { actual(); } catch (e) { threw = true; err = e; }
        let matched = threw;
        if (threw && matcher !== undefined) {
          const msg = (err && err.message !== undefined) ? String(err.message) : String(err);
          if (typeof matcher === "string") { matched = msg.indexOf(matcher) >= 0; }
          else if (matcher instanceof RegExp) { matched = matcher.test(msg); }
          else if (typeof matcher === "function") {
            // Error コンストラクタによる型チェック (例: expect(fn).toThrow(TypeError))。
            // Vitest/Jest 互換のため instanceof で判定する。
            matched = err instanceof matcher;
          }
          else { matched = false; }
        }
        assert(matched, matcher === undefined
          ? "toThrow: expected function to throw"
          : "toThrow: expected error matching " + fmt(matcher));
      },
    };
    return m;
  }

  globalThis.expect = function (actual) {
    const matchers = buildMatchers(actual, false);
    matchers.not = buildMatchers(actual, true);
    return matchers;
  };

  // emit 関数は学習者が上書き・削除できないよう defineProperty で固定する。
  // ランナーが末尾で呼ぶこの関数のみが nonce 入りのレポート行を吐けるため、
  // 偽レポート行を学習者が console.log で生成しても nonce が一致しないので採点に影響しない。
  Object.defineProperty(globalThis, ${JSON.stringify(VITEST_EMIT_GLOBAL)}, {
    value: function () {
      // safeLog はクロージャ捕獲したログ関数。 recordsJson は pushRecord で
      // 都度 JSON 文字列として組み立てた累積結果。 ここでは Array や Object の
      // serialize は一切行わないので、 学習者の prototype 汚染 (toJSON 等) を踏まない。
      safeLog(fullPrefix + "[" + recordsJson + "]");
    },
    writable: false,
    configurable: false,
    enumerable: false,
  });
})(typeof globalThis !== "undefined" ? globalThis.__jsreview_log__ : undefined);
`;
}

/**
 * 1 シナリオ分の実行スクリプト + 検証用 nonce を組み立てる (#110)。
 *
 * シム source (nonce 入り) → 実装本体 → 学習者テスト → emit 呼び出しの順で連結。
 * 戻り値の `nonce` をランナー側が保持し、 stdout から該当 nonce のレポート行だけを採点に使う。
 */
export function buildScenarioCode(
  impl: string,
  userTest: string,
): { code: string; nonce: string } {
  const nonce = generateNonce();
  const shim = buildVitestShim(nonce);
  // ランナー側が呼び出す末尾の 1 行。 シムの emit 関数は defineProperty で固定済みなので
  // 学習者が上書きしても挙動は変わらない。
  const reportLine = `globalThis[${JSON.stringify(VITEST_EMIT_GLOBAL)}]();`;
  return {
    code: `${shim}\n${impl}\n${userTest}\n${reportLine}\n`,
    nonce,
  };
}
