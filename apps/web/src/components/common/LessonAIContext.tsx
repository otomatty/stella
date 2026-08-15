/**
 * LessonPlayer から AIChatBot へ「いま学習中の文脈」 を渡すための React Context。
 *
 * - dashboard / コース一覧では Provider なし → AIChatBot は general モードで動く
 * - レッスン中は `kind: 'lesson'` を流す (code レッスン含む)
 */

import { createContext, useContext, type ReactNode } from "react";
import type { ChatContext } from "@falcon/shared/ai/types";

const LessonAIContextValue = createContext<ChatContext>({ kind: "general" });

export interface LessonAIProviderProps {
  value: ChatContext;
  children: ReactNode;
}

export function LessonAIProvider({ value, children }: LessonAIProviderProps) {
  return <LessonAIContextValue.Provider value={value}>{children}</LessonAIContextValue.Provider>;
}

export function useLessonAI(): ChatContext {
  return useContext(LessonAIContextValue);
}
