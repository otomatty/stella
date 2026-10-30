import { toast } from "sonner";
import { Copy, Share } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { type DeviceNavigator, linkShareMethod } from "@/lib/device";

/**
 * スマートフォン・タブレットで「VS Code で開く」の代わりに出すボタン。いま開いている
 * ページのリンクを共有シートで送る (無ければコピーする) ので、パソコンで同じページを
 * 開いて「VS Code で開く」から続けられる。
 *
 * 送るのはページの URL だけ。`vscode://` のリンクと接続コードは送らない — 接続コードは
 * 1 回限りの認証情報で、メッセージを経由して他人の手に渡る形にしないため。クエリと
 * ハッシュも落とす (画面の一時的な状態で、パソコンで開くのに要らない)。
 */
export function PcHandoffButton() {
  const method = linkShareMethod(navigator as DeviceNavigator);

  const send = async () => {
    const url = `${location.origin}${location.pathname}`;
    if (method === "share") {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (err) {
        // 共有シートを閉じただけなら何もしない。共有できなかったときはコピーに回す。
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("リンクをコピーしました");
    } catch {
      toast.error("リンクをコピーできませんでした");
    }
  };

  return (
    <Button type="button" onClick={() => void send()}>
      {method === "share" ? <Share size={14} /> : <Copy size={14} />}
      {method === "share" ? "リンクを送る" : "リンクをコピー"}
    </Button>
  );
}
