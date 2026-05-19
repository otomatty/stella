/**
 * LessonPlayer から AIChatBot へ「いま学習中の文脈」 を渡すための React Context。
 *
 * - dashboard / コース一覧では Provider なし → AIChatBot は general モードで動く
 * - video/text/slides/quiz レッスン中は `kind: 'lesson'` を流す
 * - code レッスン中は `kind: 'practice'` を流す (PracticeWorkspace から userCode/summary 込みで設定)
 *
 * 採点失敗時に PracticeWorkspace が `onAskAi` で context を渡し、 親 (LessonPlayer)
 * が `setLessonAIContext` で更新するフロー。
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { ChatContext } from '@falcon/shared/ai/types';

const LessonAIContextValue = createContext<ChatContext>({ kind: 'general' });

export interface LessonAIProviderProps {
  value: ChatContext;
  children: ReactNode;
}

export function LessonAIProvider({ value, children }: LessonAIProviderProps) {
  return (
    <LessonAIContextValue.Provider value={value}>{children}</LessonAIContextValue.Provider>
  );
}

export function useLessonAI(): ChatContext {
  return useContext(LessonAIContextValue);
}
