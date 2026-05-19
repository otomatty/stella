/**
 * 課題ごとの AI チャットの状態を管理する Hook。
 *
 * - 起動時に `chat-store` から履歴を読み込む。
 * - `send(text)` で user メッセージを追加し、SSE ストリームを開始する。
 *   delta は「ドラフト assistant メッセージ」に積まれ、`done` で確定する。
 * - 進行中のストリームは `AbortController` で中断可能。
 *   unmount や次の送信時に前回ストリームを abort する。
 * - 各 delta の後に debounce で localStorage 保存。確定/中断/エラー時にも保存。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@falcon/shared/ai/types";

import { streamChat } from "./api";
import { loadHistory, saveHistory } from "./chat-store";

const SAVE_DEBOUNCE_MS = 250;

interface UseAiChatArgs {
  assignmentId: string;
}

interface UseAiChatApi {
  messages: ChatMessage[];
  /** ストリーミング中の assistant 応答 (確定前)。空文字列の場合は表示不要。 */
  draftAssistant: string;
  streaming: boolean;
  error: string | null;
  /** user の質問を 1 件送る。空文字列やストリーミング中は無視。 */
  send: (text: string) => void;
  /**
   * 履歴が空の場合に最初の user メッセージを投げる。
   * `ChatPage` のマウント時にコンテキストブートストラップ用として呼ぶ。
   */
  bootstrapIfEmpty: (initialUserMessage: string) => void;
}

export function useAiChat({ assignmentId }: UseAiChatArgs): UseAiChatApi {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadHistory(assignmentId),
  );
  const [draftAssistant, setDraftAssistant] = useState<string>("");
  const [streaming, setStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ref 群はトップにまとめておく (assignmentId 切替 effect から
  // abortRef / bootstrappedRef を参照する必要があるため)
  const activeIdRef = useRef(assignmentId);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const bootstrappedRef = useRef(false);

  // 課題が変わったら状態を入れ替える。
  // 旧課題のストリームが遅延して新課題の state を汚染しないよう必ず abort し、
  // bootstrappedRef もリセットして新課題の初回コンテキスト投稿を許可する。
  useEffect(() => {
    if (activeIdRef.current === assignmentId) {return;}
    abortRef.current?.abort();
    abortRef.current = null;
    bootstrappedRef.current = false;
    activeIdRef.current = assignmentId;
    setMessages(loadHistory(assignmentId));
    setDraftAssistant("");
    setError(null);
    setStreaming(false);
  }, [assignmentId]);

  // 履歴を debounce で保存
  const scheduleSave = useCallback(
    (next: ChatMessage[]) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      const targetId = assignmentId;
      saveTimerRef.current = window.setTimeout(() => {
        saveHistory(targetId, next);
      }, SAVE_DEBOUNCE_MS);
    },
    [assignmentId],
  );

  // unmount で進行中ストリームを abort
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const startStream = useCallback(
    async (initialMessages: ChatMessage[]) => {
      // 既存のストリームを中断
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setDraftAssistant("");
      setStreaming(true);

      let accumulated = "";
      try {
        const iter = streamChat(
          {
            assignmentId,
            messages: initialMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
          { signal: controller.signal },
        );

        for await (const event of iter) {
          if (controller.signal.aborted) {break;}
          if (event.type === "text") {
            accumulated += event.delta;
            setDraftAssistant(accumulated);
          } else if (event.type === "error") {
            throw new Error(event.message);
          } else if (event.type === "done") {
            break;
          }
        }
      } catch (e) {
        // AbortError は静かに無視 (ユーザ操作によるキャンセル)
        if (controller.signal.aborted) {
          // 部分応答があれば履歴に確定保存しておく
          if (accumulated.length > 0) {
            const finalMessages: ChatMessage[] = [
              ...initialMessages,
              { role: "assistant", content: accumulated, ts: Date.now() },
            ];
            setMessages(finalMessages);
            scheduleSave(finalMessages);
          }
          setDraftAssistant("");
          setStreaming(false);
          abortRef.current = null;
          return;
        }
        setError(e instanceof Error ? e.message : String(e));
        // 確定 assistant メッセージとしては出さない (履歴を汚さない)。
        setDraftAssistant("");
        setStreaming(false);
        abortRef.current = null;
        return;
      }

      // 正常完了。 done だけ来てテキストが 0 件のケースは空 assistant を
      // 履歴に積まない (空メッセージで履歴を汚さないため)。
      if (accumulated.length > 0) {
        const finalMessages: ChatMessage[] = [
          ...initialMessages,
          { role: "assistant", content: accumulated, ts: Date.now() },
        ];
        setMessages(finalMessages);
        scheduleSave(finalMessages);
      }
      setDraftAssistant("");
      setStreaming(false);
      abortRef.current = null;
    },
    [assignmentId, scheduleSave],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || streaming) {return;}
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed, ts: Date.now() },
      ];
      setMessages(nextMessages);
      scheduleSave(nextMessages);
      void startStream(nextMessages);
    },
    [messages, streaming, scheduleSave, startStream],
  );

  // 連続再マウント (StrictMode 等) で重複ブート防止。 ref はトップで宣言済み。
  // 課題切替時には上の effect でリセットされる。
  const bootstrapIfEmpty = useCallback(
    (initialUserMessage: string) => {
      if (bootstrappedRef.current) {return;}
      if (messages.length > 0) {return;}
      const trimmed = initialUserMessage.trim();
      if (trimmed.length === 0) {return;}
      bootstrappedRef.current = true;
      const firstMessages: ChatMessage[] = [
        { role: "user", content: trimmed, ts: Date.now() },
      ];
      setMessages(firstMessages);
      scheduleSave(firstMessages);
      void startStream(firstMessages);
    },
    [messages.length, scheduleSave, startStream],
  );

  return { messages, draftAssistant, streaming, error, send, bootstrapIfEmpty };
}
