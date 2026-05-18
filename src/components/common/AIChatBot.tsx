import { useState } from 'react';
import { Sparkles, X, Send, User } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

interface Msg {
  who: 'me' | 'ai';
  body: string;
}

const INITIAL: Msg[] = [
  {
    who: 'ai',
    body:
      'こんにちは！学習アシスタントAIです。現在「Web開発基礎」コースの内容について質問できます。\n未解決の場合は「講師に引き継ぎ」から堀江メンターに転送できます。',
  },
];

export const AIChatBot = ({ onClose }: { onClose: () => void }) => {
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);

  const send = () => {
    if (!draft.trim()) return;
    const q = draft.trim();
    setMsgs((m) => [...m, { who: 'me', body: q }]);
    setDraft('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [
        ...m,
        {
          who: 'ai',
          body:
            '「関数とスコープ」のレッスンでも詳しく扱われていますが、クロージャは「関数と、その関数が作られたときの変数環境（レキシカル環境）への参照」を組にしたものです。\n\nmakeCounter を呼ぶたびに新しい count が作られるのは、呼び出しごとに新しい実行コンテキストが生成されるためです。\n\n参考: レッスン l10 「関数とスコープ」 / 3:40 付近',
        },
      ]);
    }, 900);
  };

  return (
    <div className="fixed bottom-[84px] right-6 w-[380px] h-[520px] bg-card border border-border rounded-lg shadow-lg flex flex-col z-[90] overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 bg-card">
        <div className="w-[30px] h-[30px] rounded-md bg-ink text-card grid place-items-center">
          <Sparkles size={14} />
        </div>
        <div>
          <div className="text-[13px] font-semibold">学習アシスタント</div>
          <div className="text-[11px] text-ink-3">Web開発基礎 · ナレッジRAG</div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="閉じる"
          className="ml-auto"
        >
          <X size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3.5">
        {msgs.map((m, i) => (
          <Message key={i} msg={m} />
        ))}
        {typing ? (
          <div className="flex gap-2.5 max-w-[88%]">
            <Avatar size="sm" className="bg-ink text-card">
              <AvatarFallback className="bg-ink text-card">
                <Sparkles size={12} />
              </AvatarFallback>
            </Avatar>
            <div className="bg-sunken border border-dashed border-border-strong rounded-xl px-3 py-2.5 text-[13px] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-border border-t-brand animate-spin-slow" />
              回答を生成中…
            </div>
          </div>
        ) : null}
      </div>

      <button className="mx-[18px] mt-2 bg-brand-soft border border-dashed border-brand text-brand-ink px-3 py-2 rounded-md text-xs hover:bg-[oklch(92%_0.04_265)] transition-colors text-center">
        <User size={11} className="inline mr-1 -mt-[1px]" />
        解決しなければ講師に引き継ぐ
      </button>

      <div className="px-3.5 py-3 border-t border-border flex gap-2 items-end bg-card">
        <Textarea
          placeholder="教材について質問…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-[38px] max-h-[120px] text-[13px] py-2 px-2.5"
        />
        <Button variant="accent" size="icon" onClick={send}>
          <Send size={13} />
        </Button>
      </div>
    </div>
  );
};

const Message = ({ msg }: { msg: Msg }) => {
  if (msg.who === 'me') {
    return (
      <div className="flex gap-2.5 max-w-[88%] self-end flex-row-reverse">
        <div className="bg-brand text-white rounded-xl px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">
          {msg.body}
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
      <div className="bg-sunken border border-dashed border-border-strong rounded-xl px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">
        {msg.body}
      </div>
    </div>
  );
};
