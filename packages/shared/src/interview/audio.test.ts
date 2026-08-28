import { describe, expect, it } from "vitest";

import {
  interviewAudioObjectName,
  interviewAudioTextHash,
  isInterviewAudioStale,
  parseInterviewAudioObjectName,
  isInterviewTtsModelId,
} from "./audio";

describe("interviewAudioObjectName", () => {
  it("1 質問 1 音声で <no>.mp3", () => {
    expect(interviewAudioObjectName(12)).toBe("12.mp3");
  });
});

describe("parseInterviewAudioObjectName", () => {
  it("質問番号を戻せる", () => {
    expect(parseInterviewAudioObjectName("12.mp3")).toBe(12);
  });

  it("想定外の名前は null", () => {
    expect(parseInterviewAudioObjectName("12.wav")).toBeNull();
    expect(parseInterviewAudioObjectName("abc.mp3")).toBeNull();
    expect(parseInterviewAudioObjectName("0.mp3")).toBeNull();
  });

  it("深掘り時代のキーは無視する (配信・一覧に出さない)", () => {
    expect(parseInterviewAudioObjectName("12-deep1.mp3")).toBeNull();
    expect(parseInterviewAudioObjectName("12-deep3.mp3")).toBeNull();
  });
});

describe("isInterviewAudioStale", () => {
  it("指紋が今の本文と食い違えば古い", () => {
    const text = "経験年数は？";
    expect(isInterviewAudioStale(interviewAudioTextHash(text), text)).toBe(false);
    expect(isInterviewAudioStale(interviewAudioTextHash("別の文面"), text)).toBe(true);
  });

  it("指紋を持たない音声 (書き換え前の生成) も古い扱いにする", () => {
    expect(isInterviewAudioStale(undefined, "Q")).toBe(true);
    expect(isInterviewAudioStale(null, "Q")).toBe(true);
    expect(isInterviewAudioStale("", "Q")).toBe(true);
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
