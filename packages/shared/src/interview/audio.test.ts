import { describe, expect, it } from "vitest";

import {
  interviewAudioObjectName,
  interviewAudioSegmentId,
  interviewAudioSegments,
  isInterviewAudioPart,
  parseInterviewAudioObjectName,
  parseInterviewAudioSegmentId,
  splitDeepDive,
  isInterviewTtsModelId,
} from "./audio";

describe("interviewAudioObjectName", () => {
  it("質問は従来の <no>.mp3 のまま (既存の登録済み音声を活かす)", () => {
    expect(interviewAudioObjectName(12, "question")).toBe("12.mp3");
  });

  it("深掘りは接尾辞を付ける", () => {
    expect(interviewAudioObjectName(12, "deep1")).toBe("12-deep1.mp3");
    expect(interviewAudioObjectName(12, "deep3")).toBe("12-deep3.mp3");
  });
});

describe("parseInterviewAudioObjectName", () => {
  it("質問・深掘りの両方を戻せる", () => {
    expect(parseInterviewAudioObjectName("12.mp3")).toEqual({ no: 12, part: "question" });
    expect(parseInterviewAudioObjectName("12-deep2.mp3")).toEqual({ no: 12, part: "deep2" });
  });

  it("想定外の名前は null", () => {
    expect(parseInterviewAudioObjectName("12.wav")).toBeNull();
    expect(parseInterviewAudioObjectName("abc.mp3")).toBeNull();
    expect(parseInterviewAudioObjectName("0.mp3")).toBeNull();
    expect(parseInterviewAudioObjectName("12-deep4.mp3")).toBeNull();
    expect(parseInterviewAudioObjectName("12-question.mp3")).toBeNull();
  });
});

describe("segment id", () => {
  it("往復できる", () => {
    expect(interviewAudioSegmentId(7, "deep1")).toBe("7:deep1");
    expect(parseInterviewAudioSegmentId("7:deep1")).toEqual({ no: 7, part: "deep1" });
    expect(parseInterviewAudioSegmentId("7:question")).toEqual({ no: 7, part: "question" });
  });

  it("不正な id は null", () => {
    expect(parseInterviewAudioSegmentId("7")).toBeNull();
    expect(parseInterviewAudioSegmentId("7:deep9")).toBeNull();
    expect(parseInterviewAudioSegmentId("x:question")).toBeNull();
  });

  it("isInterviewAudioPart", () => {
    expect(isInterviewAudioPart("question")).toBe(true);
    expect(isInterviewAudioPart("deep3")).toBe(true);
    expect(isInterviewAudioPart("deep4")).toBe(false);
    expect(isInterviewAudioPart(1)).toBe(false);
  });
});

describe("splitDeepDive", () => {
  it("「→」の前が面接官の一言、 後ろが受講者向けヒント", () => {
    expect(splitDeepDive("その比率で何を担当しましたか？→具体を1〜2文で添える。")).toEqual({
      ask: "その比率で何を担当しましたか？",
      hint: "具体を1〜2文で添える。",
    });
  });

  it("「→」が無ければ全文が質問", () => {
    expect(splitDeepDive("もう少し詳しく教えてください")).toEqual({
      ask: "もう少し詳しく教えてください",
      hint: null,
    });
  });
});

describe("interviewAudioSegments", () => {
  it("質問 + 本文のある深掘りだけを列挙し、 深掘りは「→」の前を読み上げる", () => {
    expect(
      interviewAudioSegments({
        no: 3,
        question: "経験年数は？",
        deep1: "具体的には？→数字を添える",
        deep2: "",
        deep3: null,
      }),
    ).toEqual([
      { no: 3, part: "question", text: "経験年数は？" },
      { no: 3, part: "deep1", text: "具体的には？" },
    ]);
  });

  it("ヒントだけの深掘り (→ の前が空) は音声化しない", () => {
    expect(
      interviewAudioSegments({ no: 4, question: "Q", deep1: "→メモだけ" }).map((s) => s.part),
    ).toEqual(["question"]);
  });
});

describe("isInterviewTtsModelId", () => {
  it("管理画面から選べるモデルだけを許可する", () => {
    expect(isInterviewTtsModelId("grok-tts")).toBe(true);
    expect(isInterviewTtsModelId("openai/tts-1")).toBe(true);
    expect(isInterviewTtsModelId("openai/tts-1-hd")).toBe(true);
  });

  it("未指定・未知・Workers AI 自前 TTS は拒否する", () => {
    expect(isInterviewTtsModelId(undefined)).toBe(false);
    expect(isInterviewTtsModelId("")).toBe(false);
    expect(isInterviewTtsModelId("xai/grok-tts")).toBe(false);
    expect(isInterviewTtsModelId("@cf/myshell-ai/melotts")).toBe(false);
  });
});
