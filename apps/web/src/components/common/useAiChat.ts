/**
 * AI チャットの状態を管理する Hook (falcon-informal P2)。
 *
 * - 起動時に `chat-store` から履歴を読み込む (key は assignmentId または 'general')
 * - `send(text)` で user メッセージを追加し、SSE ストリームを開始する。
 *   delta は「ドラフト assistant メッセージ」に積まれ、`done` で確定する。
 * - 進行中のストリームは `AbortController` で中断可能。
 *   unmount や次の送信時に前回ストリームを abort する。
 * - 各 delta の後に debounce で localStorage 保存。確定/中断/エラー時にも保存。
 * - ChatContext (general / lesson / practice) を `/api/chat` に渡せる。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ChatContext,
  ChatMessage,
  ChatRequest,
} from "@falcon/shared/ai/types";

import { streamChat } from "./api";
import { loadHistory, saveHistory } from "./chat-store";

const SAVE_DEBOUNCE_MS = 250;

interface UseAiChatArgs {
  /** practice 時に必須。 それ以外は 'general' などの安定キーを渡して履歴を分離する。 */
  storageKey: string;
  context: ChatContext;
}

interface UseAiChatApi {
  messages: ChatMessage[];
  /** ストリーミング中の assistant 応答 (確定前)。空文字列の場合は表示不要。 */
  draftAssistant: string;
  streaming: boolean;
  error: string | null;
  /** user の質問を 1 件送る。空文字列やストリーミング中は無視。 */
  send: (text: string) => void;
  /** 履歴が空の場合に最初の user メッセージを投げる (PracticeWorkspace の context bootstrap 用)。 */
  bootstrapIfEmpty: (initialUserMessage: string) => void;
}

export function useAiChat({ storageKey, context }: UseAiChatArgs): UseAiChatApi {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadHistory(storageKey),
  );
  const [draftAssistant, setDraftAssistant] = useState<string>("");
  const [streaming, setStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeKeyRef = useRef(storageKey);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const bootstrappedRef = useRef(false);

  // storageKey が変わったら状態を入れ替える。
  useEffect(() => {
    if (activeKeyRef.current === storageKey) {return;}
    abortRef.current?.abort();
    abortRef.current = null;
    bootstrappedRef.current = false;
    activeKeyRef.current = storageKey;
    setMessages(loadHistory(storageKey));
    setDraftAssistant("");
    setError(null);
    setStreaming(false);
  }, [storageKey]);

  const scheduleSave = useCallback(
    (next: ChatMessage[]) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      const targetKey = storageKey;
      saveTimerRef.current = window.setTimeout(() => {
        saveHistory(targetKey, next);
      }, SAVE_DEBOUNCE_MS);
    },
    [storageKey],
  );

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
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setDraftAssistant("");
      setStreaming(true);

      let accumulated = "";
      try {
        const body: ChatRequest = {
          context,
          messages: initialMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        };
        if (context.kind === "practice") {
          body.assignmentId = context.assignmentId;
        }
        const iter = streamChat(body, { signal: controller.signal });

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
        if (controller.signal.aborted) {
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
        setDraftAssistant("");
        setStreaming(false);
        abortRef.current = null;
        return;
      }

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
    [context, scheduleSave],
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
