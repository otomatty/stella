import { describe, expect, it } from "vitest";
import { containerEnv, DEFAULT_SANDBOX_IMAGE, dockerArgs } from "./sandbox-check.js";

describe("下書きの検査を動かすコンテナー", () => {
  it("ロケールと届くプロキシだけを渡し、秘密・認証情報付き・ループバックのプロキシは渡さない", () => {
    expect(
      containerEnv({
        PATH: "/usr/bin",
        HOME: "/home/u",
        LANG: "ja_JP.UTF-8",
        HTTPS_PROXY: "http://proxy.example:8080",
        HTTP_PROXY: "http://user:pass@proxy.example:8080",
        https_proxy: "http://127.0.0.1:3128",
        NO_PROXY: "localhost",
        ANTHROPIC_API_KEY: "sk-ant-secret",
      }),
    ).toEqual({
      LANG: "ja_JP.UTF-8",
      HTTPS_PROXY: "http://proxy.example:8080",
      NO_PROXY: "localhost",
    });
  });

  it("作業フォルダー・束ねたランナー・CA だけをマウントし、権限を落として root 以外で動かす", () => {
    const args = dockerArgs(
      {
        image: DEFAULT_SANDBOX_IMAGE,
        network: "bridge",
        runner: "/tmp/r/run-task.mjs",
        caFile: "/etc/ca.crt",
        env: { LANG: "C" },
        user: "1000:1000",
      },
      "stella-variant-check-x",
      "/tmp/work",
    );
    const mounts = args.flatMap((arg, i) => (args[i - 1] === "-v" ? [arg] : []));
    expect(mounts).toEqual([
      "/etc/ca.crt:/etc/stella/ca.crt:ro",
      "/tmp/work:/work",
      "/tmp/r/run-task.mjs:/opt/stella/run-task.mjs:ro",
    ]);
    expect(args).toEqual(
      expect.arrayContaining([
        "--rm",
        "no-new-privileges",
        "LANG=C",
        "HOME=/tmp/home",
        "NODE_EXTRA_CA_CERTS=/etc/stella/ca.crt",
      ]),
    );
    expect(args[args.indexOf("--cap-drop") + 1]).toBe("ALL");
    expect(args[args.indexOf("--user") + 1]).toBe("1000:1000");
    expect(args[args.indexOf("--network") + 1]).toBe("bridge");
    expect(args.slice(-3)).toEqual([DEFAULT_SANDBOX_IMAGE, "node", "/opt/stella/run-task.mjs"]);
  });
});
