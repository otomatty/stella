import { describe, expect, it } from "vitest";
import { parseHashes } from "./task-problem-hashes.js";

describe("parseHashes", () => {
  it("version 2 では不正な項目だけを落とし、残りの指紋を使う", () => {
    const kept = "a".repeat(64);
    expect(parseHashes(JSON.stringify({ version: 2, hashes: { q1: "broken", q2: kept } }))).toEqual(
      { q2: kept },
    );
  });
});
