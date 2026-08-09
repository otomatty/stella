/**
 * レッスンノートをサーバ (`/api/lesson-notes`) と同期する Hook (Issue #78)。
 *
 * - バックエンド設定済み + uuid レッスンのときだけサーバ保存を使う。
 *   未設定 / fixtures レッスンでは従来どおり localStorage だけで動く。
 * - 編集は即ローカルへ、 サーバへはデバウンスして送る (`lesson-progress` と同方針)。
 *   保存ボタン / レッスン切替 / pagehide では即時 flush する。
 * - 端末間 LWW: 編集時刻を添えて送り、 サーバは新しい方だけを採用する。
 *   自分の書き込みが採用されなかった場合は `conflict` を立て、 本文は上書きしない
 *   (入力中のテキストを勝手に消さないため。 再読込でサーバ側の内容を取り込む)。
 * - 旧 localStorage ノートの移行: 初回ロードでサーバに行が無ければローカル分を push する。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { clampNoteBody, MAX_NOTE_LENGTH } from '@falcon/shared/study/notes-sync';

import { isBackendConfigured } from '@/lib/backend';
import {
  clearPendingNote,
  configureNotesSync,
  readLocalNote,
  readPendingNote,
  savePendingNote,
  writeLocalNote,
  type LocalNote,
} from '@/lib/lesson-notes';
import {
  fetchLessonNote,
  isSyncableLessonId,
  saveLessonNote,
  type LessonNoteRow,
} from '@/lib/lesson-notes-api';

const AUTOSAVE_DEBOUNCE_MS = 1500;

export interface SaveResult {
  ok: boolean;
  /** 別端末の方が新しく、 サーバ側が自分の書き込みを採用しなかった。 */
  conflict: boolean;
}

export interface UseLessonNoteResult {
  body: string;
  setBody: (next: string) => void;
  /** デバウンス待ちを飛ばして即時保存する (保存ボタン用)。 */
  save: () => Promise<SaveResult>;
  loading: boolean;
  saving: boolean;
  /** サーバ同期のエラー。 */
  error: string | null;
  /**
   * この端末 (localStorage) に保存できなかった場合のエラー。 サーバ保存が無効な
   * ローカルのみの経路では、 これが立っているとき `save()` は失敗を返す。
   */
  localError: string | null;
  /** サーバ保存が有効か (false = この端末のみ)。 */
  remote: boolean;
  conflict: boolean;
  /**
   * 本文が保存上限を超えており、 超過分がサーバに同期されない。
   * 入力欄は maxLength で止めるため、 実際に立つのは上限導入前の長いノートだけ。
   */
  overLimit: boolean;
}

/** ローカルより サーバ行の方が新しいか。 時刻を持たない旧ノートはサーバを優先する。 */
function isRemoteNewer(local: LocalNote, row: LessonNoteRow): boolean {
  if (local.updatedAt === null) return true;
  const localMs = Date.parse(local.updatedAt);
  const remoteMs = Date.parse(row.updated_at);
  if (!Number.isFinite(remoteMs)) return false;
  if (!Number.isFinite(localMs)) return true;
  return remoteMs > localMs;
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'ノートの同期に失敗しました';
}

/**
 * アカウント切替で退避しておいた未送信の編集を、 本人が戻ってきたときに復元する。
 * 復元した本文は以降の hydrate で通常どおり LWW にかけられる (サーバ側の方が新しければ
 * そちらが採用され、 ローカルが新しければ push される)。
 */
function restorePending(
  userId: string | null,
  lessonId: string,
  local: LocalNote,
): LocalNote {
  if (userId === null) return local;
  const pending = readPendingNote(userId, lessonId);
  if (pending === null) return local;

  const pendingMs = Date.parse(pending.updatedAt);
  const localMs = local.updatedAt === null ? Number.NaN : Date.parse(local.updatedAt);
  if (!Number.isFinite(pendingMs)) {
    clearPendingNote(userId, lessonId);
    return local;
  }
  if (Number.isFinite(localMs)) {
    // ローカルの方が新しい = 退避は追い越されたので捨てる。
    if (pendingMs < localMs) {
      clearPendingNote(userId, lessonId);
      return local;
    }
    // 同時刻 = 一度復元した未同期のコピー。 退避は同期できるまで残す
    // (認証解決の前後で hydrate が 2 度走るため、 ここで消すと同期前に失う)。
    if (pendingMs === localMs) return local;
  }

  // 退避はここでは消さない。 サーバと同期できたことを確認してから hydrate 側で消す
  // (ここで消すと、 同期前に再びアカウントが切り替わったとき唯一のコピーを失う)。
  writeLocalNote(lessonId, pending.body, pending.updatedAt);
  return { body: pending.body, updatedAt: pending.updatedAt };
}

export function useLessonNote(
  lessonId: string,
  userId: string | null,
): UseLessonNoteResult {
  const remote =
    isBackendConfigured() && isSyncableLessonId(lessonId) && userId !== null;

  const [body, setBodyState] = useState('');
  const [loading, setLoading] = useState(remote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const localFailedRef = useRef(false);

  const bodyRef = useRef('');
  const updatedAtRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  // 編集のたびに増やす。 await をまたいだ処理が「その間に編集されたか」を判定するために使う
  // (dirtyRef はデバウンス送信が始まると false に戻るため、 この用途には使えない)。
  const editSeqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 連続するレッスン切替で、 遅れて返った hydrate が新しいレッスンの表示を壊さないようにする。
  const reqIdRef = useRef(0);
  // 送信のたびに増やす世代番号と、 進行中の送信数。 デバウンスより送信が長引くと
  // 2 本目が並走し得るため、 追い越された古い送信の結果で state を上書きしない。
  const saveSeqRef = useRef(0);
  const inFlightRef = useRef(0);
  /**
   * 表示中の本文がサーバ側と一致していることを確認できているか。
   *
   * アカウント切替で「退避すべきか」を判断するのに使う。 dirty / 送信中だけを見ると、
   * hydrate で読み込んだだけの (まだ突き合わせが終わっていない) ローカル本文を
   * 取りこぼす — その状態で切り替わると purge で唯一のコピーが消える。
   */
  const syncedRef = useRef(false);
  /**
   * このレッスンについて最後に観測したサーバ側の updated_at (epoch ms)。
   *
   * 端末の時計が遅れていると、 編集時刻がサーバの保存済み時刻より古くなり、 LWW の
   * 厳密な比較で毎回弾かれて保存できなくなる。 「自分が見た版より後の編集」であることを
   * 示すため、 送信時刻がこれ以下なら +1ms に押し上げる。 観測していない版 (真に
   * オフラインで古い編集) には影響しないので、 オフライン分が新しい版を潰すことはない。
   */
  const lastServerMsRef = useRef<number | null>(null);

  /** 送信に使う updated_at。 最後に観測したサーバ版より後になるように押し上げる。 */
  const nextUpdatedAt = (candidate: string | null): string => {
    const base = candidate ?? new Date().toISOString();
    const baseMs = Date.parse(base);
    const lastMs = lastServerMsRef.current;
    if (lastMs === null || !Number.isFinite(baseMs) || baseMs > lastMs) return base;
    return new Date(lastMs + 1).toISOString();
  };

  /** サーバ側の版を観測したら記録する。 */
  const observeServerTs = (updatedAt: string): void => {
    const ms = Date.parse(updatedAt);
    if (!Number.isFinite(ms)) return;
    if (lastServerMsRef.current === null || ms > lastServerMsRef.current) {
      lastServerMsRef.current = ms;
    }
  };

  // 別タブでのログイン切替 (`subscribeToAuth` の storage イベント) では NotesView が
  // マウントされたまま userId だけが変わる。 その場合に前ユーザーの本文を持ち越すと、
  // デバウンス送信やアンマウント時の flush が新ユーザーのトークンで前ユーザーの
  // ノートを送ってしまう。 描画中に捨てることで、 このコミットのクリーンアップ
  // (= effect より先に走る flush) にも間に合わせる。
  const userIdRef = useRef(userId);
  if (userIdRef.current !== userId) {
    const prevUserId = userIdRef.current;
    // 未送信の編集は捨てずに前ユーザー名義で退避する。 共有端末対策で uuid キーの
    // ローカルノートは破棄されるため、 ここで捨てると唯一のコピーが失われる。
    // 復元は本人が戻ってきたときだけ (hydrate 側)。
    // 「サーバと一致していると確認できていない本文」はすべて退避する (未編集でも、
    // 送信中でも、 hydrate の途中でも)。 空文字も「削除」という編集なので退避する
    // — 退避しないと、 復帰時に hydrate がサーバの古い本文を復活させてしまう。
    // updatedAt が無い = まだ何も読み込めていない初期状態なので対象外
    // (ここで空の退避を作ると、 復元時にサーバのノートを消しかねない)。
    const unsynced = !syncedRef.current && updatedAtRef.current !== null;
    if (unsynced && prevUserId !== null && isSyncableLessonId(lessonId)) {
      const saved = savePendingNote(prevUserId, lessonId, {
        body: bodyRef.current,
        updatedAt: updatedAtRef.current ?? new Date().toISOString(),
      });
      if (!saved) {
        // ここで失敗すると purge 後に復元できない。 ユーザーは既に別アカウントに
        // 切り替わっており通知先が無いため、 ログに残すに留める。
        console.error('[lesson-notes] 未送信ノートの退避に失敗しました');
      }
    }
    userIdRef.current = userId;
    bodyRef.current = '';
    updatedAtRef.current = null;
    dirtyRef.current = false;
    syncedRef.current = false;
    lastServerMsRef.current = null;
    // 進行中の hydrate / 送信の結果を、 新ユーザーの表示に反映させない。
    reqIdRef.current += 1;
    editSeqRef.current += 1;
    saveSeqRef.current += 1;
    inFlightRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // 直後の hydrate で入れ直すが、 それまでの 1 フレームでも前ユーザーの本文は見せない。
    setBodyState('');
  }

  const flush = useCallback(async (): Promise<SaveResult> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // ローカルのみの経路ではサーバに逃がせないため、 localStorage への保存失敗が
    // そのまま保存失敗になる (保存済みと偽らない)。
    if (!remote) return { ok: !localFailedRef.current, conflict: false };
    if (!dirtyRef.current) return { ok: true, conflict: false };

    // await をまたぐと ref が次のレッスンの値に変わり得るため、 送る値はここで確定させる。
    // clamp してから送り、 返ってきた行とも clamp 後の本文で比較する (サーバ側の切り詰めを
    // 「別端末で更新された」と誤検知しないため)。
    const reqId = reqIdRef.current;
    const seq = ++saveSeqRef.current;
    const editSeq = editSeqRef.current;
    const payload = clampNoteBody(bodyRef.current);
    const updatedAt = nextUpdatedAt(updatedAtRef.current);
    dirtyRef.current = false;
    inFlightRef.current += 1;
    setSaving(true);
    // この送信の結果を state に反映してよいか (レッスンが変わっておらず、 かつ
    // より新しい送信に追い越されていない)。 追い越された古い送信の返り行は、
    // 新しい本文を持つため比較すると必ず食い違い、 競合を誤検知してしまう。
    const isLatest = () => reqId === reqIdRef.current && seq === saveSeqRef.current;
    try {
      const row = await saveLessonNote(lessonId, payload, updatedAt);
      const lost = row !== null && row.body !== payload;
      if (!isLatest()) return { ok: true, conflict: false };
      // サーバが確定した updated_at をローカルにも反映する。 端末の時計が進んでいると
      // サーバ側で丸められるため、 送った未来の時刻を持ち続けると次回 hydrate で
      // 「ローカルの方が新しい」と誤判定し、 別端末の新しいノートを古い本文で
      // 上書きしてしまう。 送信中に編集された場合は触らない (その編集の時刻が正)。
      if (row !== null) observeServerTs(row.updated_at);
      if (row !== null && !lost && editSeqRef.current === editSeq) {
        updatedAtRef.current = row.updated_at;
        // 本文は据え置き (上限超過分をローカルから削らない)。 時刻だけ確定値にする。
        writeLocalNote(lessonId, bodyRef.current, row.updated_at);
        syncedRef.current = true;
      }
      setError(null);
      setConflict(lost);
      return { ok: true, conflict: lost };
    } catch (err) {
      // 失敗分は dirty に戻すだけに留める (自動の即時リトライはオフライン時に暴走するため)。
      // 次の編集 / 保存ボタン / レッスン切替で再試行される。
      dirtyRef.current = true;
      if (!isLatest()) return { ok: false, conflict: false };
      setError(toMessage(err));
      return { ok: false, conflict: false };
    } finally {
      if (reqId === reqIdRef.current) {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        if (inFlightRef.current === 0) setSaving(false);
      }
    }
  }, [lessonId, remote, userId]);

  // ローカルを即座に表示し、 サーバ側と突き合わせる (取り込み or 移行 push)。
  useEffect(() => {
    // アカウント切替の検知 (前ユーザーのローカルノートの破棄) をここでも行う。
    // 子の effect は親 (App) の effect より先に走るため、 App の configureNotesSync を
    // 待つと破棄前の localStorage — つまり前ユーザーのノート — を読んでしまう。
    // 冪等なので二重に呼んでも害はない。
    configureNotesSync(userId);
    const local = restorePending(userId, lessonId, readLocalNote(lessonId));
    const reqId = ++reqIdRef.current;
    const seqAtStart = editSeqRef.current;
    bodyRef.current = local.body;
    updatedAtRef.current = local.updatedAt;
    dirtyRef.current = false;
    // 突き合わせが終わるまでは「同期済み」と見なさない。
    syncedRef.current = false;
    lastServerMsRef.current = null;
    setBodyState(local.body);
    setConflict(false);
    setError(null);
    setLocalError(null);
    localFailedRef.current = false;
    // 前のレッスンの送信が残っていても、 新しいレッスンの保存表示に持ち越さない。
    inFlightRef.current = 0;
    setSaving(false);

    if (!remote) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      /** 同期できた (= サーバが確定値を持っている) ので、 退避を消す。 */
      const markSynced = (): void => {
        syncedRef.current = true;
        if (userId !== null) clearPendingNote(userId, lessonId);
      };

      /**
       * hydrate 中の push の結果をローカルへ反映する。
       *   - サーバが採用した  … 確定した updated_at を書き戻す (未来時刻の丸めを取り込む。
       *     取り込まないと次回 hydrate で「ローカルの方が新しい」と誤判定する)
       *   - 別端末が勝った    … その行を取り込む (この時点ではユーザーは未編集なので、
       *     警告を出すより取り込む方が状態が揃う)
       * どちらの場合もサーバ側が確定値になるため、 退避を消す。
       */
      const settleAfterPush = (
        stored: LessonNoteRow | null,
        sent: string,
        seq: number,
      ): void => {
        if (stored === null) return;
        observeServerTs(stored.updated_at);
        // 送信中に編集された / レッスンが切り替わったら触らない。
        if (reqId !== reqIdRef.current || editSeqRef.current !== seq) return;
        if (stored.body === sent) {
          // 本文は据え置き (上限超過分をローカルから削らない)。 時刻だけ確定値にする。
          updatedAtRef.current = stored.updated_at;
          writeLocalNote(lessonId, bodyRef.current, stored.updated_at);
        } else {
          bodyRef.current = stored.body;
          updatedAtRef.current = stored.updated_at;
          setBodyState(stored.body);
          writeLocalNote(lessonId, stored.body, stored.updated_at);
        }
        markSynced();
      };

      try {
        const row = await fetchLessonNote(lessonId);
        if (reqId !== reqIdRef.current) return;
        // GET の間に編集されていたら、 取り込みも移行 push も行わない (打ち込んだ
        // テキストを消さない)。 編集分は debounce 送信が LWW で押し上げる。
        // dirtyRef はデバウンス送信の開始で false に戻るためガードには使えない。
        if (editSeqRef.current !== seqAtStart) return;

        if (row !== null) observeServerTs(row.updated_at);

        if (row === null) {
          // サーバ未保存。 旧 localStorage のノートがあれば移行する。
          if (local.body === '') {
            markSynced();
            return;
          }
          const updatedAt = nextUpdatedAt(local.updatedAt);
          const seq = editSeqRef.current;
          const sent = clampNoteBody(local.body);
          const stored = await saveLessonNote(lessonId, sent, updatedAt);
          if (reqId !== reqIdRef.current) return;
          // await の間に編集されていたら、 移行前の本文 / 時刻で上書きしない。
          // (上書きするとローカルが編集前に巻き戻り、 更新時刻も移行分に戻るため
          //  次の debounce 送信が LWW の厳密な > 比較で弾かれて編集が失われる)
          if (editSeqRef.current !== seq) return;
          if (stored === null) {
            writeLocalNote(lessonId, local.body, updatedAt);
            updatedAtRef.current = updatedAt;
            return;
          }
          settleAfterPush(stored, sent, seq);
          return;
        }

        if (isRemoteNewer(local, row)) {
          bodyRef.current = row.body;
          updatedAtRef.current = row.updated_at;
          setBodyState(row.body);
          writeLocalNote(lessonId, row.body, row.updated_at);
          // サーバ側の方が新しい = 退避分は追い越された。
          markSynced();
        } else if (clampNoteBody(local.body) !== row.body && local.updatedAt !== null) {
          // ローカルの方が新しい (他端末で古い内容が保存されている) → 押し上げる。
          // 比較を clamp 後で行うのは、 上限超過ノートが毎回 push され続けないようにするため。
          const seq = editSeqRef.current;
          const sent = clampNoteBody(local.body);
          const stored = await saveLessonNote(lessonId, sent, nextUpdatedAt(local.updatedAt));
          // GET と POST の間に別端末が書いていれば LWW でこちらが弾かれる。
          // その場合の確定値はサーバ行なので取り込む。
          settleAfterPush(stored, sent, seq);
        } else {
          // すでにサーバと同じ内容。
          markSynced();
        }
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        setError(toMessage(err));
        // 突き合わせに失敗した (オフライン等)。 ローカルに本文があるなら未送信扱いにして、
        // 保存ボタン / レッスン切替 / pagehide で再試行できるようにする。
        // (dirty のままにしないと、 保存を押しても送信されず成功と表示されてしまう)
        // 空文字も「削除」という有効な状態なので、 本文の有無ではなく
        // 「ローカルに更新時刻がある = 突き合わせ対象がある」で判定する。
        if (updatedAtRef.current !== null && editSeqRef.current === seqAtStart) {
          dirtyRef.current = true;
        }
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    })();
  }, [lessonId, remote, userId]);

  // レッスン切替 / アンマウント時にデバウンス待ちを送り切る。 クリーンアップは
  // 次の effect より先に走るため、 ref はまだ切替前のレッスンの値を保持している。
  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  // pagehide はモバイル含めて beforeunload より確実に発火する (best-effort)。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHide = () => {
      void flush();
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [flush]);

  const setBody = useCallback(
    (next: string) => {
      const now = new Date().toISOString();
      bodyRef.current = next;
      updatedAtRef.current = now;
      editSeqRef.current += 1;
      syncedRef.current = false;
      setBodyState(next);
      const failed = !writeLocalNote(lessonId, next, now);
      // 状態が変わったときだけ更新する (毎キーストロークの再レンダを避ける)。
      if (failed !== localFailedRef.current) {
        localFailedRef.current = failed;
        setLocalError(
          failed
            ? 'この端末に保存できませんでした (ブラウザのストレージ容量を確認してください)'
            : null,
        );
      }
      if (!remote) return;
      dirtyRef.current = true;
      setConflict(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [flush, lessonId, remote],
  );

  const save = useCallback(async (): Promise<SaveResult> => flush(), [flush]);

  return {
    body,
    setBody,
    save,
    loading,
    saving,
    error,
    localError,
    remote,
    conflict,
    overLimit: remote && body.length > MAX_NOTE_LENGTH,
  };
}
