// 問題
// 1. 設定を表す型 Config を定義して export してください。すべて読み取り専用にする
//    - name: 文字列
//    - allowedOrigins: 文字列の配列（配列そのものも読み取り専用）
//    - limits: { maxUsers: 数値; maxRooms: 数値 }（中のプロパティも読み取り専用）
//
// 2. addOrigin(config, origin)
//    allowedOrigins の末尾に origin を足した、新しい Config を返す。
//    すでに含まれているときは、config をそのまま返す
//
// 3. setMaxUsers(config, maxUsers)
//    limits.maxUsers だけを変えた、新しい Config を返す（入れ子のオブジェクトもスプレッド構文で作り直す）
//
// 説明すること（答えは、この下に // のコメントで書く）
// - const で宣言した変数と、readonly のプロパティは、それぞれ何を変えられなくするのか

// const は変数に別の値を入れ直すことを禁じる。readonly はオブジェクトのプロパティの書き換えを禁じる
export type Config = {
  readonly name: string;
  readonly allowedOrigins: readonly string[];
  readonly limits: {
    readonly maxUsers: number;
    readonly maxRooms: number;
  };
};

export function addOrigin(config: Config, origin: string): Config {
  if (config.allowedOrigins.includes(origin)) {
    return config;
  }
  return { ...config, allowedOrigins: [...config.allowedOrigins, origin] };
}

export function setMaxUsers(config: Config, maxUsers: number): Config {
  return { ...config, limits: { ...config.limits, maxUsers } };
}
