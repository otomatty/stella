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
