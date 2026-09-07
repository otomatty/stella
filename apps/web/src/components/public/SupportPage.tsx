/**
 * サポートページ (Issue: Google ログイン不具合 / サポート窓口)。
 *
 * ログイン画面の「サポート」リンク先。 ログイン不要で `/support` から到達する。
 * App.tsx が認証分岐より前にこのコンポーネントへ振り分ける (`?cert=` / `/auth/callback` と同列)。
 *
 * 構成: ログイン関連 FAQ + 問い合わせフォーム (`POST /api/support`) + メール直送フォールバック。
 */

import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, HelpCircle, Mail, Send, Loader2, CheckCircle } from "@/lib/icons";
import { supportMailSubjectPrefix } from "@stella/shared/brand/display";
import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isApiConfigured } from "@/lib/api-client";
import { SUPPORT_CATEGORIES, submitSupportInquiry, type SupportCategory } from "@/lib/support-api";

const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || "saedgewell@gmail.com";

const LOGIN_FAQ: { q: string; a: string }[] = [
  {
    q: "Google でログインできません。",
    a: "ポップアップやリダイレクトがブロックされていないか、 ブラウザの設定をご確認ください。 別の Google アカウントでログインしている場合は、 一度サインアウトしてから再度お試しください。",
  },
  {
    q: "ボタンを押しても何も起こりません。",
    a: "ブラウザの拡張機能 (広告ブロッカー等) やプライベートモードが影響することがあります。 通常モードの別ブラウザでお試しいただくか、 Cookie を許可してから再読み込みしてください。",
  },
  {
    q: "ログイン後にエラー画面が表示されます。",
    a: "端末の時刻が大きくずれているとログインに失敗することがあります。 自動時刻設定を有効にしてから再度お試しください。 改善しない場合は、 下記フォームより表示されたエラー内容をお知らせください。",
  },
];

export const SupportPage = () => {
  const apiReady = isApiConfigured();
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `${supportMailSubjectPrefix()}サポートのお問い合わせ`,
  )}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<SupportCategory>("login");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      toast.error("メールアドレスとお問い合わせ内容を入力してください");
      return;
    }
    if (!apiReady) {
      toast.error("問い合わせフォームが利用できません。 メールでお問い合わせください。");
      return;
    }
    setSubmitting(true);
    try {
      await submitSupportInquiry({
        name: name.trim(),
        email: email.trim(),
        category,
        message: message.trim(),
      });
      setDone(true);
    } catch (err) {
      const m = err instanceof Error ? err.message : "送信に失敗しました";
      toast.error(m);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[680px] px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Brand size="md" />
          <a
            href="/"
            className="inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-foreground"
          >
            <ChevronLeft size={14} />
            ログインに戻る
          </a>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <HelpCircle size={22} className="text-brand" />
          <h1 className="text-[24px] font-semibold tracking-tight">サポート</h1>
        </div>
        <p className="mb-8 text-[13.5px] text-ink-3">
          ログインに関するよくあるご質問と、 解決しない場合のお問い合わせ窓口です。
        </p>

        {/* よくある質問 */}
        <section className="mb-10">
          <h2 className="mb-3 text-[15px] font-semibold">よくある質問</h2>
          <div className="space-y-3">
            {LOGIN_FAQ.map((item) => (
              <div key={item.q} className="rounded-md border border-border-2 bg-card p-4">
                <div className="mb-1 text-[13.5px] font-medium">{item.q}</div>
                <div className="text-[12.5px] leading-relaxed text-ink-3">{item.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 問い合わせフォーム */}
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-semibold">お問い合わせ</h2>

          {done ? (
            <div className="rounded-md border border-border-2 bg-card p-6 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-brand" />
              <div className="mb-1 text-[14px] font-medium">送信しました</div>
              <p className="text-[12.5px] text-ink-3">
                お問い合わせを受け付けました。
                入力いただいたメールアドレス宛に折り返しご連絡します。
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setDone(false);
                  setMessage("");
                }}
              >
                続けて問い合わせる
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <Label htmlFor="support-name">お名前 (任意)</Label>
                <Input
                  id="support-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  autoComplete="name"
                />
              </div>

              <div>
                <Label htmlFor="support-email">メールアドレス</Label>
                <Input
                  id="support-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="support-category">お問い合わせの種類</Label>
                <select
                  id="support-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportCategory)}
                  className="flex h-10 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-soft"
                >
                  {SUPPORT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="support-message">お問い合わせ内容</Label>
                <Textarea
                  id="support-message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="状況をできるだけ詳しくご記入ください (お使いの端末・ブラウザ・表示されたエラー文言など)。"
                />
              </div>

              <Button type="submit" variant="accent" size="full" disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                送信する
              </Button>

              {!apiReady && (
                <p className="text-[11.5px] text-ink-3">
                  ※ フォーム送信は現在ご利用いただけません。
                  下記より直接メールでお問い合わせください。
                </p>
              )}
            </form>
          )}
        </section>

        {/* メール直送フォールバック */}
        <div className="rounded-md border border-border-2 bg-sunken p-4 text-[12.5px] text-ink-3">
          フォームが使えない場合は、 こちらまで直接メールでお問い合わせください。
          <a
            href={mailtoHref}
            className="ml-1 inline-flex items-center gap-1 text-brand underline underline-offset-2"
          >
            <Mail size={13} />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
};
