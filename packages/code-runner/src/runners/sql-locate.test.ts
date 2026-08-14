import { afterEach, describe, expect, it } from "vitest";
import { setSqlJsLocateFile, sqlJsFileUrl } from "./sql-runner.js";

describe("sqlJsFileUrl", () => {
  afterEach(() => {
    setSqlJsLocateFile((file) => `/sqljs/${file}`);
  });

  it("defaults to the Vite publicDir path", () => {
    expect(sqlJsFileUrl("sql-wasm.wasm")).toBe("/sqljs/sql-wasm.wasm");
  });

  it("uses the override for the extension grader bundle", () => {
    setSqlJsLocateFile((file) => `https://webview.example/${file}`);
    expect(sqlJsFileUrl("sql-wasm.wasm")).toBe("https://webview.example/sql-wasm.wasm");
  });
});
