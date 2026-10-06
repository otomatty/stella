/**
 * ログインなしで読める教材 (Issue #41) を取る Hook。公開の導入案内 (`/start`) とログイン画面が使う。
 *
 * 読み出しは AbortController で打ち切る (レッスンを素早く切り替えたときに古い応答で上書きしない)。
 */

import { useEffect, useState } from "react";

import type { PublicLesson, PublicUnit } from "@stella/shared/cms/types";
import { getPublicLesson, listPublicUnits } from "@/lib/public-content-api";

interface Loadable<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/** 公開の単元とレッスンの一覧。取れなかったときは空配列 + error。 */
export function usePublicUnits(enabled = true): Loadable<PublicUnit[]> {
  const [state, setState] = useState<Loadable<PublicUnit[]>>({
    data: [],
    loading: enabled,
    error: null,
  });
  useEffect(() => {
    if (!enabled) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    listPublicUnits(controller.signal)
      .then((units) => {
        if (!controller.signal.aborted) setState({ data: units, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : "読み込めませんでした",
        });
      });
    return () => controller.abort();
  }, [enabled]);
  return state;
}

/** 公開のレッスン 1 件。無い・公開していないものは data が null で error も null。 */
export function usePublicLesson(lessonId: string): Loadable<PublicLesson | null> {
  const [state, setState] = useState<Loadable<PublicLesson | null>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    getPublicLesson(lessonId, controller.signal)
      .then((lesson) => {
        if (!controller.signal.aborted) setState({ data: lesson, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "読み込めませんでした",
        });
      });
    return () => controller.abort();
  }, [lessonId]);
  return state;
}
