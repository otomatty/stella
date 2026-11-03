/**
 * 本棚のファイル (表紙・画像・音声・動画) を `<img>/<audio>/<video>` に渡す URL。
 *
 * 本番は画面と API が同じオリジン (Web の Worker が `/api/*` を中継) で、ログインは Cookie。
 * なので API の URL をそのまま渡せば、ブラウザが Range 付きで少しずつ取りに行く。
 * ローカル開発で API が別オリジン (開発用トークンを Bearer で送る) のときだけ、fetch で
 * 取って blob URL にする (大きな動画でも全部読むので、開発用の代わり)。
 */
import { useEffect, useState } from "react";
import { apiFetchRaw } from "./api-client";

const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");

export function apiIsSameOrigin(serverUrl = SERVER_URL, origin = globalThis.location?.origin) {
  if (!origin) return false;
  if (!serverUrl) return true;
  try {
    return new URL(serverUrl).origin === origin;
  } catch {
    return false;
  }
}

export interface MediaUrl {
  url: string | null;
  failed: boolean;
}

/** `path` は `/api/library/...`。null なら何も取らない。 */
export function useLibraryMediaUrl(path: string | null): MediaUrl {
  const direct = apiIsSameOrigin();
  const [state, setState] = useState<MediaUrl>(() => ({
    url: path && direct ? `${SERVER_URL}${path}` : null,
    failed: false,
  }));
  useEffect(() => {
    if (!path) {
      setState({ url: null, failed: false });
      return;
    }
    if (direct) {
      setState({ url: `${SERVER_URL}${path}`, failed: false });
      return;
    }
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setState({ url: null, failed: false });
    void apiFetchRaw(path, { signal: controller.signal })
      .then((res) => res.blob())
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ url: null, failed: true });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, direct]);
  return state;
}
