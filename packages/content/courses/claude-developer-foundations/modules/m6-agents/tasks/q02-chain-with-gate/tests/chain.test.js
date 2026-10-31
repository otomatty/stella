import { describe, expect, test } from "vitest";
import { runChain } from "../src/chain.js";

// 呼ばれた引数を記録する段の関数を作る。
function recorder(produce) {
  const calls = [];
  const run = async (value, context) => {
    calls.push({ value, context });
    return produce(value, context);
  };
  return { run, calls };
}

const headingCount = (outline) =>
  outline.headings.length >= 3 && outline.headings.length <= 5
    ? null
    : `見出しは 3〜5 個にしてください (いまは ${outline.headings.length} 個)`;

describe("runChain", () => {
  test("前の段の出力を次の段に渡し、最後の出力を返す", async () => {
    const outline = recorder(async (topic) => ({
      topic,
      headings: ["背景", "手順", "注意"],
    }));
    const draft = recorder(
      async (value) => `${value.topic}: ${value.headings.join("・")}`,
    );
    const result = await runChain("経費の申請", [
      { name: "outline", run: outline.run, check: headingCount },
      { name: "draft", run: draft.run },
    ]);

    expect(result).toEqual({
      ok: true,
      result: "経費の申請: 背景・手順・注意",
      outputs: {
        outline: { topic: "経費の申請", headings: ["背景", "手順", "注意"] },
        draft: "経費の申請: 背景・手順・注意",
      },
    });
    expect(outline.calls[0]).toEqual({
      value: "経費の申請",
      context: { attempt: 1, feedback: null },
    });
    expect(draft.calls[0].value).toEqual(result.outputs.outline);
  });

  test("ゲートを通らなければ、次の段を呼ばずに止まった段と理由を返す", async () => {
    const outline = recorder(async () => ({ headings: ["背景"] }));
    const draft = recorder(async () => "本文");
    const result = await runChain("経費の申請", [
      { name: "outline", run: outline.run, check: headingCount },
      { name: "draft", run: draft.run },
    ]);

    expect(result).toEqual({
      ok: false,
      failedAt: "outline",
      reason: "見出しは 3〜5 個にしてください (いまは 1 個)",
      outputs: {},
    });
    expect(draft.calls).toHaveLength(0);
  });

  test("通った段の出力は、止まったときも outputs に残す", async () => {
    const result = await runChain("経費の申請", [
      { name: "outline", run: async () => ({ headings: ["a", "b", "c"] }) },
      {
        name: "draft",
        run: async () => "x".repeat(3000),
        check: (text) =>
          text.length <= 2000 ? null : "2000 字以内にしてください",
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failedAt).toBe("draft");
    expect(result.outputs).toEqual({ outline: { headings: ["a", "b", "c"] } });
  });

  test("retries があれば、ゲートの理由を feedback にしてやり直す", async () => {
    const outline = recorder(async (_topic, context) =>
      context.attempt === 1
        ? { headings: ["背景"] }
        : { headings: ["背景", "手順", "注意"] },
    );
    const result = await runChain("経費の申請", [
      { name: "outline", run: outline.run, check: headingCount, retries: 2 },
    ]);

    expect(result.ok).toBe(true);
    expect(outline.calls.map((call) => call.context)).toEqual([
      { attempt: 1, feedback: null },
      {
        attempt: 2,
        feedback: "見出しは 3〜5 個にしてください (いまは 1 個)",
      },
    ]);
    expect(outline.calls[1].value).toBe("経費の申請");
  });

  test("retries を使い切ったら、最後の理由で止まる", async () => {
    const outline = recorder(async () => ({ headings: [] }));
    const result = await runChain("経費の申請", [
      { name: "outline", run: outline.run, check: headingCount, retries: 1 },
    ]);
    expect(outline.calls).toHaveLength(2);
    expect(result).toEqual({
      ok: false,
      failedAt: "outline",
      reason: "見出しは 3〜5 個にしてください (いまは 0 個)",
      outputs: {},
    });
  });

  test("段が例外を投げたら、次の段を呼ばずに理由を返す", async () => {
    const draft = recorder(async () => "本文");
    const result = await runChain("経費の申請", [
      {
        name: "outline",
        run: async () => {
          throw new Error("構成を作れませんでした");
        },
        retries: 3,
      },
      { name: "draft", run: draft.run },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failedAt).toBe("outline");
    expect(result.reason).toContain("構成を作れませんでした");
    expect(draft.calls).toHaveLength(0);
  });

  test("段の名前が重なっていたら、どの段も呼ばずにエラーにする", async () => {
    const first = recorder(async () => "a");
    await expect(
      runChain("経費の申請", [
        { name: "draft", run: first.run },
        { name: "draft", run: async () => "b" },
      ]),
    ).rejects.toThrow(/draft/);
    expect(first.calls).toHaveLength(0);
  });

  test("段がなければ、入力をそのまま返す", async () => {
    expect(await runChain("経費の申請", [])).toEqual({
      ok: true,
      result: "経費の申請",
      outputs: {},
    });
  });
});
