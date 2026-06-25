/**
 * サポート問い合わせ API クライアント。
 *
 * ログイン不要の公開フォームから `POST /api/support` を叩く。
 * ログイン中はトークンが自動付与され、 サーバ側で user_id が紐付く (任意)。
 */

import { apiFetch } from "./api-client";

export const SUPPORT_CATEGORIES = [
  { value: "login", label: "ログインできない" },
  { value: "account", label: "アカウント・登録について" },
  { value: "billing", label: "請求・お支払い" },
  { value: "bug", label: "不具合の報告" },
  { value: "other", label: "その他" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["value"];

export interface SupportInquiryInput {
  name: string;
  email: string;
  category: SupportCategory;
  message: string;
}

export async function submitSupportInquiry(
  input: SupportInquiryInput,
): Promise<{ ok: boolean; id: string | null }> {
  return apiFetch<{ ok: boolean; id: string | null }>("/api/support", {
    method: "POST",
    body: input,
  });
}
