import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

import { Sparkles, X, Send, User } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { findAssignment } from "@stella/shared/assignments";
import { buildContextUserMessage } from "@stella/shared/ai/prompt";

import { useAiChat } from "./useAiChat";
import { useLessonAI } from "./LessonAIContext";

interface AIChatBotProps {
  /** 開いているか。 閉じている間も mount したままにして開閉アニメーションを成立させる。 */
  open: boolean;
  onClose: () => void;
  /**
   * 閉じたあとフォーカスを戻す先 (FAB)。 モバイルは modal Dialog なので、
   * 明示的に戻さないと body に落ちる (Radix の既定復帰は効かなかった)。
   */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

const GENERAL_INTRO = "学習アシスタント AI です。 教材内容や演習で詰まったことを質問してください。";

/**
 * 学習アシスタント AI のチャット UI。
 *
 * - sm 以上: FAB の上にせり出す右下固定パネル
 * - sm 未満: `Drawer` で画面下部から出るボトムシート (shadcn/ui の Drawer と同じ挙動)
 *
 * 中身 (ヘッダ / 履歴 / 入力欄) は共通で、 外側の器だけを差し替える。
 */
export const AIChatBot = ({ open, onClose, returnFocusRef }: AIChatBotProps) => {
  const context = useLessonAI();
  const isMobile = useIsMobileViewport();

  const storageKey = useMemo(() => {
    if (context.kind === "practice") {
      return context.assignmentId;
    }
    if (context.kind === "lesson") {
      return `lesson::${context.stageTitle}::${context.lessonTitle}`;
    }
    return "general";
  }, [context]);

  // useAiChat は open/isMobile の分岐より上に置く (器を差し替えても履歴を持ち越すため)。
  // 結果として、 応答の途中で閉じてもストリームは中断せず裏で走り切り、 次に開いたときに
  // 続きが見える。 従来の「閉じる = unmount = abort」から意図して変えた挙動。
  // 中断したいときは AppShell 側で AIChatBot を unmount する (ログアウト / 画面遷移)。
  const { messages, draftAssistant, streaming, error, send, bootstrapIfEmpty } = useAiChat({
    storageKey,
    context,
  });

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // practice context で履歴が空なら、 第 1 ユーザーメッセージを context summary で組み立てて送信。
  // 閉じている間は投げない (開いて初めてアシスタントが動き出す)。
  useEffect(() => {
    if (!open || context.kind !== "practice") {
      return;
    }
    const assignment = findAssignment(context.assignmentId);
    if (!assignment) {
      return;
    }
    const initial = buildContextUserMessage(assignment, context.userCode, context.summary);
    bootstrapIfEmpty(initial);
  }, [open, context, bootstrapIfEmpty]);

  // 末尾自動スクロール
  // biome-ignore lint/correctness/useExhaustiveDependencies: 新着メッセージで再スクロールする
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, draftAssistant, open]);

  const subtitle = useMemo(() => {
    if (context.kind === "practice") {
      const a = findAssignment(context.assignmentId);
      return a ? `課題: ${a.title}` : "採点失敗コンテキスト引き継ぎ中";
    }
    if (context.kind === "lesson") {
      return `${context.stageTitle} · ${context.lessonTitle}`;
    }
    return "ナレッジRAG";
  }, [context]);

  const handleSend = () => {
    if (!draft.trim() || streaming) {
      return;
    }
    send(draft);
    setDraft("");
  };

  const contextNotice =
    context.kind === "practice" ? (
      <div className="mx-3 mt-2 shrink-0 rounded-md border border-dashed border-brand bg-brand-soft px-2.5 py-1.5 text-[11px] text-brand-ink">
        失敗した課題のコンテキストを引き継いでいます
      </div>
    ) : null;

  const history = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3.5">
      {messages.length === 0 && context.kind !== "practice" ? (
        <div className="text-[13px] text-ink-3 leading-relaxed">{GENERAL_INTRO}</div>
      ) : null}
      {messages.map((m) => (
        <Message key={`${m.ts ?? "live"}-${m.role}-${m.content}`} from={m.role} body={m.content} />
      ))}
      {streaming || draftAssistant ? (
        <Message from="assistant" body={draftAssistant} streaming={streaming} />
      ) : null}
      {error ? (
        <div className="text-[12px] text-danger rounded-md border border-danger/30 bg-danger-soft px-3 py-2">
          {error}
        </div>
      ) : null}
    </div>
  );

  const composer = (
    <div className="px-3.5 py-3 border-t border-border flex gap-2 items-end bg-card">
      <Textarea
        placeholder={streaming ? "応答中…" : "教材について質問…"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
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
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            onClose();
          }
        }}
      >
        <DrawerContent
          className="h-[85dvh]"
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef?.current;
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
        >
          <DrawerHeader className="flex-row items-center gap-2.5 py-2.5">
            <div className="w-[30px] h-[30px] shrink-0 rounded-md bg-ink text-card grid place-items-center">
              <Sparkles size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-[13px]">学習アシスタント</DrawerTitle>
              <DrawerDescription className="text-[11px] truncate">{subtitle}</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="閉じる">
                <X size={14} />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          {contextNotice}
          {history}
          <div className="pb-[env(safe-area-inset-bottom)] bg-card">{composer}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) {
    return null;
  }

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
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="閉じる">
          <X size={14} />
        </Button>
      </div>

      {contextNotice}
      {history}
      {composer}
    </div>
  );
};

interface MessageProps {
  from: "user" | "assistant";
  body: string;
  streaming?: boolean;
}

const Message = ({ from, body, streaming = false }: MessageProps) => {
  if (from === "user") {
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
            {body || (streaming ? "..." : "")}
          </ReactMarkdown>
        </div>
        {streaming ? (
          <span className="inline-block w-1.5 h-3 align-middle bg-ink-3 animate-pulse ml-1" />
        ) : null}
      </div>
    </div>
  );
};
