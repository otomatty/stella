import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import { Sparkles, X, Send, User } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { findAssignment } from '@falcon/shared/assignments';
import { buildContextUserMessage } from '@falcon/shared/ai/prompt';

import { useAiChat } from './useAiChat';
import { useLessonAI } from './LessonAIContext';

interface AIChatBotProps {
  onClose: () => void;
}

const GENERAL_INTRO = '学習アシスタント AI です。 教材内容や演習で詰まったことを質問してください。';

export const AIChatBot = ({ onClose }: AIChatBotProps) => {
  const context = useLessonAI();

  const storageKey = useMemo(() => {
    if (context.kind === 'practice') {return context.assignmentId;}
    if (context.kind === 'lesson') {
      return `lesson::${context.courseTitle}::${context.lessonTitle}`;
    }
    return 'general';
  }, [context]);

  const { messages, draftAssistant, streaming, error, send, bootstrapIfEmpty } = useAiChat({
    storageKey,
    context,
  });

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // practice context で履歴が空なら、 第 1 ユーザーメッセージを context summary で組み立てて送信。
  useEffect(() => {
    if (context.kind !== 'practice') {return;}
    const assignment = findAssignment(context.assignmentId);
    if (!assignment) {return;}
    const initial = buildContextUserMessage(
      assignment,
      context.userCode,
      context.summary,
    );
    bootstrapIfEmpty(initial);
  }, [context, bootstrapIfEmpty]);

  // 末尾自動スクロール
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {el.scrollTop = el.scrollHeight;}
  }, [messages, draftAssistant]);

  const subtitle = useMemo(() => {
    if (context.kind === 'practice') {
      const a = findAssignment(context.assignmentId);
      return a ? `課題: ${a.title}` : '採点失敗コンテキスト引き継ぎ中';
    }
    if (context.kind === 'lesson') {
      return `${context.courseTitle} · ${context.lessonTitle}`;
    }
    return 'ナレッジRAG';
  }, [context]);

  const handleSend = () => {
    if (!draft.trim() || streaming) {return;}
    send(draft);
    setDraft('');
  };

  return (
    <div className="fixed bottom-[84px] right-6 w-[420px] h-[560px] bg-card border border-border rounded-lg shadow-lg flex flex-col z-[90] overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 bg-card">
        <div className="w-[30px] h-[30px] rounded-md bg-ink text-card grid place-items-center">
          <Sparkles size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">学習アシスタント</div>
          <div className="text-[11px] text-ink-3 truncate">{subtitle}</div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={14} />
        </Button>
      </div>

      {context.kind === 'practice' ? (
        <div className="mx-3 mt-2 rounded-md border border-dashed border-brand bg-brand-soft px-2.5 py-1.5 text-[11px] text-brand-ink">
          失敗した課題のコンテキストを引き継いでいます
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3.5"
      >
        {messages.length === 0 && context.kind !== 'practice' ? (
          <div className="text-[13px] text-ink-3 leading-relaxed">{GENERAL_INTRO}</div>
        ) : null}
        {messages.map((m, i) => (
          <Message key={i} role={m.role} body={m.content} />
        ))}
        {streaming || draftAssistant ? (
          <Message role="assistant" body={draftAssistant} streaming={streaming} />
        ) : null}
        {error ? (
          <div className="text-[12px] text-danger rounded-md border border-danger/30 bg-danger-soft px-3 py-2">
            {error}
          </div>
        ) : null}
      </div>

      <div className="px-3.5 py-3 border-t border-border flex gap-2 items-end bg-card">
        <Textarea
          placeholder={streaming ? '応答中…' : '教材について質問…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={streaming}
          className="min-h-[38px] max-h-[120px] text-[13px] py-2 px-2.5"
        />
        <Button
          variant="accent"
          size="icon"
          onClick={handleSend}
          disabled={streaming || draft.trim().length === 0}
          aria-label="送信"
        >
          <Send size={13} />
        </Button>
      </div>
    </div>
  );
};

interface MessageProps {
  role: 'user' | 'assistant';
  body: string;
  streaming?: boolean;
}

const Message = ({ role, body, streaming = false }: MessageProps) => {
  if (role === 'user') {
    return (
      <div className="flex gap-2.5 max-w-[88%] self-end flex-row-reverse">
        <Avatar size="sm" className="sf-gradient-135-bg text-white">
          <AvatarFallback className="sf-gradient-135-bg text-white">
            <User size={12} />
          </AvatarFallback>
        </Avatar>
        <div className="sf-gradient-bg text-white rounded-xl px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">
          {body}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 max-w-[88%]">
      <Avatar size="sm" className="bg-ink text-card">
        <AvatarFallback className="bg-ink text-card">
          <Sparkles size={12} />
        </AvatarFallback>
      </Avatar>
      <div className="bg-sunken border border-dashed border-border-strong rounded-xl px-3 py-2.5 text-[13px] leading-relaxed min-w-0">
        <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_pre]:my-1 [&_code]:text-[12px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {body || (streaming ? '...' : '')}
          </ReactMarkdown>
        </div>
        {streaming ? (
          <span className="inline-block w-1.5 h-3 align-middle bg-ink-3 animate-pulse ml-1" />
        ) : null}
      </div>
    </div>
  );
};
