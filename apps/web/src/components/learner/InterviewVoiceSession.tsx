/**
 * 面談対策 — 音声セッション (対話ログ UI。 Issue #234)。
 *
 * 練習は「読む UI に音声ボタンが付いた形」ではなく、 面接官バブルと自分のバブルが
 * 積み上がるスレッドにする。 1 問のやり取りは
 *   聞く (質問音声を自動再生。 質問文は既定で非表示 = 耳だけモード)
 *   → 答える (録音 + 経過タイマー。 目安時間を超えると色が変わる)
 *   → 深掘り①〜③ が音声で続く
 *   → 振り返り (自分の回答と 型 / NG / 評価軸 を並べ、 改善点メモを書く + 自己評価)
 * の順に進む。 マイクを使えない環境向けにサイレントモード (録音を省いて回答例を読む) を残す。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Mic, Play, Plus, Square, Volume2 } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import type { InterviewAudioPart } from "@falcon/shared/interview/audio";
import { interviewAudioSegmentId } from "@falcon/shared/interview/audio";
import {
  FIX_NOTE_CHIPS,
  type FixNote,
  normalizeFixNoteText,
  sortFixNotesForHistory,
  unresolvedFixNotes,
} from "@falcon/shared/interview/fix-notes";
import {
  nextUnratedIndex,
  practiceSetProgress,
  remainingPracticeQuestions,
} from "@falcon/shared/interview/practice-set";
import {
  type SessionTurn,
  buildSessionTurns,
  formatElapsed,
  parseTimeLimitSec,
  timerTone,
} from "@falcon/shared/interview/session";
import {
  addFixNote,
  fetchQuestionAudio,
  type LearnerInterviewQuestion,
  type ProgressEvent,
  setFixNoteResolved,
  transcribeRecording,
} from "@/lib/interview-prep-api";
import { cn } from "@/lib/utils";

/** セグメントごとの objectURL キャッシュ (同じ音声を何度も取り直さない)。 */
const ttsUrlCache = new Map<string, string>();

function shuffle(nos: number[]): number[] {
  const a = [...nos];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = a[i];
    const right = a[j];
    if (left === undefined || right === undefined) continue;
    a[i] = right;
    a[j] = left;
  }
  return a;
}

/** 1 ターン分の自分の回答 (録音 + 文字起こし。 パスした場合は passed)。 */
interface AnswerLog {
  part: InterviewAudioPart;
  transcript: string | null;
  recordingUrl: string | null;
  elapsedSec: number;
  passed: boolean;
}

const DEEP_LABELS: Record<InterviewAudioPart, string> = {
  question: "質問",
  deep1: "深掘り①",
  deep2: "深掘り②",
  deep3: "深掘り③",
};

/**
 * 「今日の練習セット」(Issue #235) の実行コンテキスト。 渡されると出題は
 * シャッフルではなくセットの順番になり、 最後まで答えたら `onAllDone` で終わる。
 */
export interface VoiceSessionSet {
  id: string;
  /** セットの出題順 (サーバが SM-2 で選定した 10 問)。 */
  questionNos: number[];
  /** すでに自己評価を付けた質問 (再開時はその次から始める)。 */
  completedNos: number[];
  /** 全問終えた (= サマリへ)。 */
  onAllDone: () => void;
  /** セットを切り上げてサマリへ。 */
  onFinish: () => void;
  /** 中断して準備ホームへ戻る (セットは残る)。 */
  onSuspend: () => void;
}

export function InterviewVoiceSession({
  pool,
  audioSegments,
  backendEnabled,
  canRecordProgress,
  practiceSet,
  onProgress,
  onFixNoteChange,
}: {
  pool: LearnerInterviewQuestion[];
  /** 音声が登録済みのセグメント (`12:deep1`)。 */
  audioSegments: string[];
  backendEnabled: boolean;
  /** 自己評価・改善点メモを保存できるか (staff の受講者プレビューでは false)。 */
  canRecordProgress: boolean;
  /** セット出題のとき。 サブ導線の「全問からランダム」では null。 */
  practiceSet?: VoiceSessionSet | null;
  onProgress: (no: number, event: ProgressEvent) => void;
  onFixNoteChange: (note: FixNote) => void;
}) {
  const [order, setOrder] = useState<number[]>(() =>
    practiceSet
      ? remainingPracticeQuestions(
          practiceSet.questionNos,
          practiceSet.completedNos,
          pool.map((d) => d.no),
        )
      : shuffle(pool.map((d) => d.no)),
  );
  const [qi, setQi] = useState(0);
  /**
   * 再開時にすでに終えていた問題数。 出題順からは外すが、 見出しは
   * 「4 / 10 問目」とセット全体で数えたいので位置の下駄として持つ。
   */
  const [doneOffset, setDoneOffset] = useState(() =>
    practiceSet
      ? practiceSetProgress(practiceSet.questionNos, practiceSet.completedNos).completed
      : 0,
  );
  /**
   * 出題の回数。 質問の状態は `key` の付け替えで捨てるが、 出題が 1 問だけのときは
   * 次へ進んでも `cur.no` が変わらず、 振り返り画面のまま固まってしまう。 移動のたびに
   * これを進めて、 同じ質問へ戻る場合もやり取りをやり直せるようにする。
   */
  const [round, setRound] = useState(0);
  /** 質問文は既定で非表示 (耳だけで受けて答える練習にする)。 */
  const [showText, setShowText] = useState(false);
  /** マイクを使えない環境向け: 録音を省いて回答例を読むだけにする。 */
  const [silent, setSilent] = useState(false);
  /** パスした質問へ一周して戻ったか (セットが終わらない理由を画面に出す)。 */
  const [revisiting, setRevisiting] = useState(false);

  // フィルタ (またはセット) が変わったら出題順を作り直す。 進捗の楽観更新で pool の
  // 参照だけが変わるケースでは作り直さない (自己評価のたびにシャッフルされるのを防ぐ)。
  // セットの completedNos は答えるたびに増えるが、 ここでは再開時の残りを決めるのに
  // しか使わないので依存に入れない (答えるたびに出題順が組み直されてしまう)。
  const poolKey = pool.map((d) => d.no).join(",");
  const setId = practiceSet?.id ?? "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: 出題順はプール / セットが変わったときだけ作り直す
  useEffect(() => {
    const poolNos = poolKey === "" ? [] : poolKey.split(",").map(Number);
    if (practiceSet) {
      setOrder(
        remainingPracticeQuestions(practiceSet.questionNos, practiceSet.completedNos, poolNos),
      );
      setDoneOffset(
        practiceSetProgress(practiceSet.questionNos, practiceSet.completedNos).completed,
      );
    } else {
      setOrder(shuffle(poolNos));
      setDoneOffset(0);
    }
    setRevisiting(false);
    setQi(0);
    setRound((r) => r + 1);
  }, [poolKey, setId]);

  const audioSet = useMemo(() => new Set(audioSegments), [audioSegments]);
  const cur = pool.find((d) => d.no === order[qi % Math.max(order.length, 1)]);
  if (!cur) return null;

  /**
   * 「この質問をパス」でセットが閉じてしまう状況か (未評価が今の 1 問だけ)。 パスは
   * 「後でやる」操作なので、 それでセットが終わって未回答が確定するのは意図とずれる。
   * ボタンを塞いで、 明示的な「ここで終了してサマリを見る」へ誘導する。
   */
  const passWouldEndSet =
    practiceSet !== null &&
    practiceSet !== undefined &&
    nextUnratedIndex(order, qi, practiceSet.completedNos) === null;

  /**
   * セットの移動。 前へ進むときは「まだ自己評価していない質問」を順に辿り、 末尾まで来たら
   * パスした質問へ戻る — 単に次の番号へ進めると、 パスした質問が末尾到達でセットごと
   * 閉じられて置き去りになる。 残りが無くなってはじめて終了サマリへ渡す。
   * 「前の問題」は 1 つ前に戻るだけで巡回しない (先頭では無効)。
   * 「全問からランダム」(サブ導線) は従来どおり巡回する。
   */
  const move = (delta: number) => {
    if (practiceSet) {
      if (delta < 0) {
        if (qi === 0) return;
        setQi(qi - 1);
        setRound((r) => r + 1);
        return;
      }
      const target = nextUnratedIndex(order, qi, practiceSet.completedNos);
      if (target === null) {
        practiceSet.onAllDone();
        return;
      }
      // 一周して戻った = パスした質問の再挑戦。 画面にもそう出す。
      if (target <= qi) setRevisiting(true);
      setQi(target);
      setRound((r) => r + 1);
      return;
    }
    setQi((i) => (i + delta + order.length) % order.length);
    setRound((r) => r + 1);
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-sunken/40">
        {practiceSet ? (
          <span className="text-[11px] px-2 py-[2px] rounded-full font-bold sf-gradient-bg text-white">
            今日の練習セット
          </span>
        ) : null}
        <span className="text-[12px] text-ink-3 tabular-nums">
          {/* セットは残りだけを出題するので、 見出しはセット全体での位置に直して出す */}
          {doneOffset + (qi % Math.max(order.length, 1)) + 1} /{" "}
          {practiceSet ? practiceSet.questionNos.length : order.length} 問目
        </span>
        {revisiting ? (
          <span className="text-[11.5px] text-warning">
            パスした質問に戻っています — 終えるには「ここで終了してサマリを見る」
          </span>
        ) : null}
        <span className="text-[11.5px] text-ink-4 hidden sm:inline">
          {cur.subcategory}
          {cur.time ? ` ・ 目安 ${cur.time}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <Chip active={showText} onClick={() => setShowText((v) => !v)}>
            質問文を表示
          </Chip>
          <Chip active={silent} onClick={() => setSilent((v) => !v)}>
            サイレントモード
          </Chip>
        </div>
      </div>

      <QuestionExchange
        key={`${cur.no}:${round}`}
        q={cur}
        audioSet={audioSet}
        backendEnabled={backendEnabled}
        canRecordProgress={canRecordProgress}
        showText={showText}
        silent={silent}
        onRevealText={() => setShowText(true)}
        onFixNoteChange={onFixNoteChange}
        onFinish={(event) => {
          if (event) onProgress(cur.no, event);
          move(1);
        }}
      />

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border flex-wrap">
        <button
          type="button"
          disabled={Boolean(practiceSet) && qi === 0}
          className="px-3 py-1.5 rounded-sm border border-border text-[12.5px] cursor-pointer hover:bg-sunken disabled:opacity-50 disabled:cursor-default"
          onClick={() => move(-1)}
        >
          前の問題
        </button>
        <button
          type="button"
          disabled={passWouldEndSet}
          title={
            passWouldEndSet
              ? "残りはこの質問だけです。終えるには「ここで終了してサマリを見る」を使ってください"
              : undefined
          }
          className="px-3 py-1.5 rounded-sm border border-border text-[12.5px] cursor-pointer hover:bg-sunken disabled:opacity-50 disabled:cursor-default"
          onClick={() => move(1)}
        >
          この質問をパス
        </button>
        {practiceSet ? (
          <>
            <button
              type="button"
              className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
              onClick={practiceSet.onSuspend}
            >
              中断する（あとで再開）
            </button>
            <button
              type="button"
              className="text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
              onClick={practiceSet.onFinish}
            >
              ここで終了してサマリを見る
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
            onClick={() => {
              setOrder(shuffle(pool.map((d) => d.no)));
              setQi(0);
              setRound((r) => r + 1);
            }}
          >
            出題順をシャッフルし直す
          </button>
        )}
      </div>
    </Card>
  );
}

/**
 * 1 問のやり取り。 面接官ターン (質問 → 深掘り) を 1 つずつ進め、 終わったら振り返りへ。
 * `key={q.no}` で質問ごとに状態を捨てる (録音・再生の後始末は unmount で行う)。
 */
function QuestionExchange({
  q,
  audioSet,
  backendEnabled,
  canRecordProgress,
  showText,
  silent,
  onRevealText,
  onFixNoteChange,
  onFinish,
}: {
  q: LearnerInterviewQuestion;
  audioSet: Set<string>;
  backendEnabled: boolean;
  canRecordProgress: boolean;
  showText: boolean;
  silent: boolean;
  onRevealText: () => void;
  onFixNoteChange: (note: FixNote) => void;
  /** 自己評価まで終えて次の質問へ。 event が null なら進捗は記録しない。 */
  onFinish: (event: ProgressEvent | null) => void;
}) {
  const turns = useMemo(() => buildSessionTurns(q), [q]);
  const limitSec = useMemo(() => parseTimeLimitSec(q.time), [q.time]);

  const [turnIndex, setTurnIndex] = useState(0);
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [recState, setRecState] = useState<"idle" | "recording" | "transcribing">("idle");
  /**
   * 経過時間。 どのターンのものかを一緒に持ち、 表示は現在のターンのぶんだけに絞る —
   * 遅れて届いた文字起こしでターンが進んだ後も、 前のターンの秒数が残らないようにする。
   */
  const [elapsed, setElapsed] = useState<{ turn: number; sec: number }>({ turn: 0, sec: 0 });
  const [error, setError] = useState<string | null>(null);
  const [playingPart, setPlayingPart] = useState<InterviewAudioPart | null>(null);
  const [loadingPart, setLoadingPart] = useState<InterviewAudioPart | null>(null);
  /** 自動再生が拒否された (ブラウザのポリシー)。 バブルに手動再生を促す。 */
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  /** マイク取得中 (許可ダイアログ表示中を含む)。 ボタンを塞いで二重取得を防ぐ。 */
  const [acquiring, setAcquiring] = useState(false);

  const acquiringRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedUrlsRef = useRef<string[]>([]);
  /**
   * 音声取得も文字起こしも非同期なので、 解決前に質問が変わる (= このインスタンスが
   * unmount される) ことがある。 その場合 audioRef はまだ空でクリーンアップが効かず、
   * 前の質問の音声が新しい質問に重なって鳴るため、 再生・状態更新の前にこれで弾く。
   */
  const aliveRef = useRef(true);
  /**
   * 表示中のターン。 マイク許可のダイアログ中にパスされたかを、 解決後の
   * `startRecording` から見るために持つ (state はその時点の値に固定されている)。
   */
  const turnIndexRef = useRef(turnIndex);
  turnIndexRef.current = turnIndex;
  /**
   * 録音時間を数えるインターバル。 パス・アンマウントは `onstop` を外してから
   * 止めるので、 停止処理はここから直接消す (onstop 任せだと回り続ける)。
   */
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearTicker = () => {
    if (tickerRef.current === null) return;
    clearInterval(tickerRef.current);
    tickerRef.current = null;
  };
  /** 読み上げ取得の世代番号 (古い取得の結果を鳴らさない)。 */
  const playRequestRef = useRef(0);
  /**
   * マイク取得の世代番号。 パスやサイレント切替で録音を捨てるたびに進めて、 許可待ちの
   * 取得も無効化する。 ターン番号だけでは最終ターンのパス (振り返りへ入るので turnIndex が
   * 変わらない) を弾けず、 振り返り画面の裏で録音が始まってしまう。
   */
  const acquireRequestRef = useRef(0);
  /** サイレントモードへ切り替わったかを非同期処理から見るための最新値。 */
  const silentRef = useRef(silent);
  silentRef.current = silent;

  const currentTurn: SessionTurn | undefined = turns[turnIndex];
  const unresolved = useMemo(() => unresolvedFixNotes(q.fix_notes ?? []), [q.fix_notes]);

  // アンマウント時: 再生・録音を止めてマイクと objectURL を解放する。
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      audioRef.current?.pause();
      if (tickerRef.current !== null) clearInterval(tickerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        // 録音中に質問が変わったら、 onstop を外してから止める —
        // 旧質問の文字起こし API を裏で叩かせない。
        rec.onstop = null;
        rec.stop();
      }
      for (const track of rec?.stream.getTracks() ?? []) track.stop();
      for (const url of recordedUrlsRef.current) URL.revokeObjectURL(url);
      recordedUrlsRef.current = [];
    };
  }, []);

  // 経過タイマー (録音中のみ)。
  useEffect(() => {
    if (recState !== "recording") return;
    const t = setInterval(() => setElapsed((e) => ({ turn: e.turn, sec: e.sec + 1 })), 1000);
    return () => clearInterval(t);
  }, [recState]);

  /**
   * 鳴っている読み上げを止め、 取得中のものも無効化する。 回答を始める・ターンを
   * 進める・振り返りへ入る、 のいずれでも呼ぶ — 進行中の取得を放置すると、
   * 後から解決した音声が録音や次のターンに重なって鳴ってしまう。
   */
  const stopPlayback = useCallback(() => {
    playRequestRef.current++;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingPart(null);
    setLoadingPart(null);
  }, []);

  const playPart = useCallback(
    async (part: InterviewAudioPart) => {
      if (!backendEnabled) return;
      // 音声が無いセグメントでも、 先に前の再生を止めてから抜ける。
      stopPlayback();
      if (!audioSet.has(interviewAudioSegmentId(q.no, part))) return;
      /**
       * 取得は非同期なので、 回線が遅いと「深掘りへ進む → 前のターンの音声が後から
       * 解決して鳴る」が起こる。 aliveRef は質問の切り替え (unmount) しか見ないため、
       * 同じ質問の中のターン移動はこの世代番号で弾く (最新の 1 本だけ再生する)。
       */
      const request = playRequestRef.current;
      const isStale = () => !aliveRef.current || playRequestRef.current !== request;
      try {
        const id = interviewAudioSegmentId(q.no, part);
        let url = ttsUrlCache.get(id);
        if (!url) {
          setLoadingPart(part);
          const blob = await fetchQuestionAudio(q.no, part);
          url = URL.createObjectURL(blob);
          ttsUrlCache.set(id, url);
        }
        if (isStale()) return;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setPlayingPart((p) => (p === part ? null : p));
        await audio.play();
        if (isStale()) {
          audio.pause();
          return;
        }
        setPlayingPart(part);
        setAutoplayBlocked(false);
      } catch {
        if (isStale()) return;
        setPlayingPart(null);
        // 自動再生が拒否される環境 (ユーザー操作なしの再生をブロックするブラウザ) が
        // あるので、 バブルに「音声を再生」を出して手動で始められるようにする。
        setAutoplayBlocked(true);
      } finally {
        if (!isStale()) setLoadingPart(null);
      }
    },
    [audioSet, backendEnabled, q.no, stopPlayback],
  );

  // 面接官ターンが進むたびに質問音声を自動再生する (サイレントモードでは鳴らさない)。
  useEffect(() => {
    const turn = turns[turnIndex];
    // 振り返りへ入った・サイレントへ切り替えた・ターンが尽きた場合は鳴らさず止める。
    if (silent || reviewing || !turn) {
      stopPlayback();
      return;
    }
    void playPart(turn.part);
  }, [turnIndex, turns, silent, reviewing, playPart, stopPlayback]);

  /**
   * サイレントモードへ切り替えたら、 鳴っている読み上げを止めて録音も破棄する。
   * 切替後は録音ボタン自体が画面から消えるため、 そのままだと止める手段がなくなる。
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: 切替の瞬間だけ後始末する (再生・録音の参照は ref)
  useEffect(() => {
    if (!silent) return;
    stopPlayback();
    cancelRecording();
  }, [silent]);

  /**
   * 回答 1 件を積んで次のターンへ (最後まで来たら振り返りへ)。 `fromIndex` は回答した
   * ターン — 文字起こしは数秒遅れて解決するため、 その間にパスして先へ進んでいることが
   * ある。 進み方を単調 (Math.max) にして、 遅れて届いた結果でターンが巻き戻らないようにする。
   */
  const pushAnswer = (log: AnswerLog, fromIndex: number) => {
    setLogs((ls) => [...ls.filter((l) => l.part !== log.part), log]);
    if (fromIndex + 1 < turns.length) setTurnIndex((i) => Math.max(i, fromIndex + 1));
    else setReviewing(true);
  };

  const finishRecording = async (
    rec: MediaRecorder,
    turn: SessionTurn,
    turnIndexAtStart: number,
    seconds: number,
  ) => {
    for (const track of rec.stream.getTracks()) track.stop();
    if (!aliveRef.current) return;
    /**
     * 文字起こしを待つ間にパスして次のターンの録音を始められる。 その場合この完了処理は
     * 「もう現役ではない」レコーダーのもので、 録音状態を書き換えると走っている録音の
     * 停止ボタンが消えてしまう。 回答ログは (単調な進み方で) 積んでよいが、
     * 状態の更新は自分がまだ現役のときだけにする。
     */
    const isCurrentRecorder = () => recorderRef.current === rec;
    const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
    if (blob.size === 0) {
      if (isCurrentRecorder()) {
        recorderRef.current = null;
        setRecState("idle");
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    recordedUrlsRef.current.push(url);
    if (isCurrentRecorder()) setRecState("transcribing");
    let transcript: string | null = null;
    try {
      const r = await transcribeRecording(q.no, blob);
      transcript = r.transcript || "（無音、または聞き取れませんでした）";
    } catch (e) {
      // 文字起こしに失敗しても録音自体は聞き直せる。 パスして次のターンへ移った後の
      // 失敗は、 いま答えているターンの話ではないので画面には出さない (回答ログには
      // 文字起こしなしとして残る)。
      if (aliveRef.current && isCurrentRecorder()) {
        setError(e instanceof Error ? e.message : "文字起こしに失敗しました");
      }
    }
    if (!aliveRef.current) return;
    if (isCurrentRecorder()) {
      recorderRef.current = null;
      setRecState("idle");
    }
    pushAnswer(
      {
        part: turn.part,
        transcript,
        recordingUrl: url,
        elapsedSec: seconds,
        passed: false,
      },
      turnIndexAtStart,
    );
  };

  const startRecording = async () => {
    const turn = currentTurn;
    if (!turn) return;
    const turnIndexAtStart = turnIndex;
    // マイク許可のダイアログ中は recState が idle のままなので、 連打すると
    // getUserMedia が複数走って recorderRef が上書きされ、 先に立ち上がった
    // レコーダーを止める手段が無くなる。 取得中はここで弾く (ボタンも disabled)。
    // 世代番号を進めるのはこの後 — 連打で進めると先行の取得まで無効になってしまう。
    if (acquiringRef.current) return;
    const acquireRequest = ++acquireRequestRef.current;
    acquiringRef.current = true;
    setAcquiring(true);
    setError(null);
    // 取得中の読み上げも無効化する (後から解決して録音に重なって鳴るのを防ぐ)。
    stopPlayback();
    /** 録音開始まで漕ぎ着けなかった場合に解放するストリーム (成功したら undefined)。 */
    let pending: MediaStream | undefined;
    try {
      pending = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 許可のダイアログ中に質問が変わると、 クリーンアップは recorderRef が空のまま
      // 走り終えている。 ここで弾かないとマイクを掴んだまま録音が始まってしまう。
      // 同じ理由でパス・サイレントモードへの切替も弾く — 進んだ後に始まった録音は、
      // 答え終えたはずのターンの回答として積まれ、 サイレント中や振り返り中は停止ボタンも
      // 出ないまま録音が続いてしまう。 世代番号はパス (最終ターンの場合を含む) を、
      // ターン番号は取りこぼしを二重に見る。 マイクは finally で解放する。
      if (
        !aliveRef.current ||
        acquireRequestRef.current !== acquireRequest ||
        turnIndexRef.current !== turnIndexAtStart ||
        silentRef.current
      ) {
        return;
      }
      // Chromium/Firefox は webm/opus、 Safari は mp4 (m4a)。 Whisper はどちらも受ける。
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(pending, mimeType ? { mimeType } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      let seconds = 0;
      clearTicker();
      tickerRef.current = setInterval(() => {
        seconds += 1;
      }, 1000);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        clearTicker();
        void finishRecording(rec, turn, turnIndexAtStart, seconds);
      };
      rec.start();
      // ここから先はレコーダー側 (停止・アンマウント) がストリームを解放する。
      pending = undefined;
      setElapsed({ turn: turnIndexAtStart, sec: 0 });
      setRecState("recording");
    } catch {
      if (aliveRef.current) {
        setError(
          "マイクを利用できません。ブラウザのマイク許可を確認するか、サイレントモードに切り替えてください",
        );
      }
    } finally {
      // 中断・生成失敗・start() の失敗のいずれでもマイクを解放する。
      for (const track of pending?.getTracks() ?? []) track.stop();
      acquiringRef.current = false;
      if (aliveRef.current) setAcquiring(false);
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  /**
   * 録音を破棄する (パス・サイレントモードへの切替)。 `onstop` を外してから止めるので、
   * 文字起こしには進まず、 タイマーとマイクだけ確実に解放する。
   */
  const cancelRecording = () => {
    // 許可待ちの取得も無効化する (解決後に録音が始まらないように)。
    acquireRequestRef.current++;
    clearTicker();
    const rec = recorderRef.current;
    if (rec) {
      if (rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      for (const track of rec.stream.getTracks()) track.stop();
      recorderRef.current = null;
    }
    setRecState("idle");
  };

  const passTurn = () => {
    const turn = currentTurn;
    if (!turn) return;
    stopPlayback();
    cancelRecording();
    pushAnswer(
      {
        part: turn.part,
        transcript: null,
        recordingUrl: null,
        elapsedSec: 0,
        passed: true,
      },
      turnIndex,
    );
  };

  // 表示するのは現在のターンで計った秒数だけ (別ターンのものは 0 = 未計測)。
  const shownSec = elapsed.turn === turnIndex ? elapsed.sec : 0;
  const tone = timerTone(shownSec, limitSec);
  const logByPart = new Map(logs.map((l) => [l.part, l]));

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* 対話ログ: 面接官バブルと自分のバブルが交互に積み上がる */}
      <div className="flex flex-col gap-2.5">
        {turns.slice(0, turnIndex + 1).map((turn, i) => (
          <div key={turn.part} className="flex flex-col gap-2.5">
            <InterviewerBubble
              label={DEEP_LABELS[turn.part]}
              text={turn.ask}
              showText={showText || silent}
              playing={playingPart === turn.part}
              loading={loadingPart === turn.part}
              hasAudio={backendEnabled && audioSet.has(interviewAudioSegmentId(q.no, turn.part))}
              autoplayBlocked={autoplayBlocked}
              onPlay={() => void playPart(turn.part)}
              onRevealText={onRevealText}
              isCurrent={!reviewing && i === turnIndex}
            />
            {logByPart.has(turn.part) ? (
              <SelfBubble log={logByPart.get(turn.part) as AnswerLog} />
            ) : null}
          </div>
        ))}
      </div>

      {error ? <p className="text-[12px] text-destructive">{error}</p> : null}

      {!reviewing ? (
        <>
          {/* 答える直前に前回の改善点メモを 1 行で出す (= 改善ループ) */}
          {unresolved.length > 0 && turnIndex === 0 ? (
            <p className="text-[12px] text-warning bg-warning/10 rounded-sm px-3 py-2">
              前回の改善点: {unresolved.map((n) => n.text).join(" ・ ")}
            </p>
          ) : null}

          {silent || !backendEnabled ? (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-full sf-gradient-bg text-white text-[13.5px] font-bold cursor-pointer hover:brightness-105"
                onClick={() =>
                  pushAnswer(
                    {
                      part: currentTurn?.part ?? "question",
                      transcript: null,
                      recordingUrl: null,
                      elapsedSec: 0,
                      passed: false,
                    },
                    turnIndex,
                  )
                }
              >
                声に出して答えた — 次へ
              </button>
              <span className="text-[11.5px] text-ink-4">
                サイレントモード: 録音せず、質問文と回答例を読んで進めます
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              {recState === "recording" ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-destructive text-white text-[14px] font-bold cursor-pointer hover:brightness-105"
                  onClick={stopRecording}
                >
                  <Square size={16} />
                  停止して文字起こし
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full sf-gradient-bg text-white text-[14px] font-bold cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-default"
                  disabled={recState === "transcribing" || acquiring}
                  onClick={() => void startRecording()}
                >
                  {acquiring || recState === "transcribing" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Mic size={16} />
                  )}
                  {acquiring
                    ? "マイクを準備中…"
                    : recState === "transcribing"
                      ? "文字起こし中…"
                      : "録音して答える"}
                </button>
              )}
              <span
                className={cn(
                  "text-[22px] font-semibold tabular-nums",
                  tone === "over"
                    ? "text-destructive"
                    : tone === "warn"
                      ? "text-warning"
                      : "text-ink-3",
                )}
              >
                {formatElapsed(shownSec)}
              </span>
              {limitSec ? (
                <span className="text-[11.5px] text-ink-4">
                  目安 {q.time}
                  {tone === "over" ? " — 超過しています" : ""}
                </span>
              ) : null}
              <button
                type="button"
                className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
                onClick={passTurn}
              >
                このターンをパス
              </button>
            </div>
          )}
        </>
      ) : (
        <ExchangeReview
          q={q}
          turns={turns}
          logs={logs}
          canRecordProgress={canRecordProgress}
          onFixNoteChange={onFixNoteChange}
          onFinish={onFinish}
        />
      )}
    </div>
  );
}

function InterviewerBubble({
  label,
  text,
  showText,
  playing,
  loading,
  hasAudio,
  autoplayBlocked,
  isCurrent,
  onPlay,
  onRevealText,
}: {
  label: string;
  text: string;
  showText: boolean;
  playing: boolean;
  loading: boolean;
  hasAudio: boolean;
  /** 自動再生がブラウザに拒否された (手動再生を促す)。 */
  autoplayBlocked: boolean;
  isCurrent: boolean;
  onPlay: () => void;
  onRevealText: () => void;
}) {
  return (
    <div className="flex gap-2.5 items-start">
      <span className="size-8 shrink-0 rounded-full bg-brand/10 text-brand text-[10.5px] font-bold inline-flex items-center justify-center">
        面接官
      </span>
      <div
        className={cn(
          "flex-1 min-w-0 rounded-lg rounded-tl-none border p-3 flex flex-col gap-2",
          isCurrent ? "border-brand/40 bg-brand/5" : "border-border bg-sunken/40",
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">
            {label}
          </span>
          {hasAudio ? (
            <button
              type="button"
              className={cn(
                "px-2 py-[3px] rounded-sm border text-[11.5px] cursor-pointer inline-flex items-center gap-1",
                autoplayBlocked && isCurrent
                  ? "border-warning bg-warning/10 text-warning font-semibold"
                  : "border-border hover:bg-sunken",
              )}
              onClick={onPlay}
            >
              {loading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : playing ? (
                <Volume2 size={11} />
              ) : (
                <Play size={11} />
              )}
              {playing ? "再生中" : autoplayBlocked && isCurrent ? "質問を再生" : "もう一度聞く"}
            </button>
          ) : (
            <span className="text-[11px] text-ink-4">音声は未登録です</span>
          )}
          {!showText ? (
            <button
              type="button"
              className="ml-auto text-[11.5px] text-brand underline underline-offset-2 cursor-pointer"
              onClick={onRevealText}
            >
              質問文を表示
            </button>
          ) : null}
        </div>
        {showText ? (
          <p className="text-[14px] leading-relaxed">{text}</p>
        ) : (
          <p className="text-[12.5px] text-ink-4">
            耳だけモード — 聞こえたとおりに声に出して答えましょう
          </p>
        )}
        {autoplayBlocked && isCurrent ? (
          <p className="text-[11.5px] text-warning">
            ブラウザの設定で自動再生が止まりました。「質問を再生」を押してください。
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SelfBubble({ log }: { log: AnswerLog }) {
  return (
    <div className="flex gap-2.5 items-start justify-end">
      <div className="max-w-[85%] rounded-lg rounded-tr-none border border-border bg-surface p-3 flex flex-col gap-1.5">
        {log.passed ? (
          <p className="text-[12.5px] text-ink-4">パスしました</p>
        ) : (
          <>
            {log.recordingUrl ? (
              // biome-ignore lint/a11y/useMediaCaption: 受講者自身の練習録音で、 内容は直下に文字起こしとして表示している
              <audio src={log.recordingUrl} controls className="h-8 w-full max-w-xs" />
            ) : null}
            {log.transcript ? (
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{log.transcript}</p>
            ) : (
              <p className="text-[12.5px] text-ink-4">声に出して回答しました（録音なし）</p>
            )}
            {log.elapsedSec > 0 ? (
              <span className="text-[11px] text-ink-4 tabular-nums">
                {formatElapsed(log.elapsedSec)}
              </span>
            ) : null}
          </>
        )}
      </div>
      <span className="size-8 shrink-0 rounded-full bg-muted text-ink-2 text-[10.5px] font-bold inline-flex items-center justify-center">
        自分
      </span>
    </div>
  );
}

/** 振り返り: 自分の回答と 型 / NG / 評価軸 を並べ、 改善点メモと自己評価を記録する。 */
function ExchangeReview({
  q,
  turns,
  logs,
  canRecordProgress,
  onFixNoteChange,
  onFinish,
}: {
  q: LearnerInterviewQuestion;
  turns: SessionTurn[];
  logs: AnswerLog[];
  canRecordProgress: boolean;
  onFixNoteChange: (note: FixNote) => void;
  onFinish: (event: ProgressEvent | null) => void;
}) {
  const template = q.personal_answer_template ?? q.answer_template ?? null;
  const logByPart = new Map(logs.map((l) => [l.part, l]));

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <div className="text-[13px] font-semibold">振り返り</div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">
            Your Answers ・ 自分の回答
          </div>
          {turns.map((turn) => {
            const log = logByPart.get(turn.part);
            return (
              <div key={turn.part} className="flex flex-col gap-1">
                <span className="text-[12px] font-medium">
                  {DEEP_LABELS[turn.part]}: {turn.ask}
                </span>
                {log?.recordingUrl ? (
                  // biome-ignore lint/a11y/useMediaCaption: 受講者自身の練習録音で、 内容は直下に文字起こしとして表示している
                  <audio src={log.recordingUrl} controls className="h-8 w-full max-w-xs" />
                ) : null}
                <p className="text-[12.5px] text-ink-2 leading-relaxed whitespace-pre-wrap">
                  {log?.passed ? "パス" : (log?.transcript ?? "（録音・文字起こしなし）")}
                </p>
                {turn.hint ? (
                  <p className="text-[11.5px] text-ink-4 leading-relaxed">ヒント: {turn.hint}</p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {template ? <ReviewBlock label="Answer ・ 回答の型">{template}</ReviewBlock> : null}
          {q.ng ? <ReviewBlock label="Avoid ・ 避けたい回答">{q.ng}</ReviewBlock> : null}
          {q.criteria ? <ReviewBlock label="Criteria ・ 評価軸">{q.criteria}</ReviewBlock> : null}
        </div>
      </div>

      <FixNoteEditor
        questionNo={q.no}
        notes={q.fix_notes ?? []}
        canEdit={canRecordProgress}
        onFixNoteChange={onFixNoteChange}
      />

      {canRecordProgress && !q.is_reverse ? (
        <div className="flex items-center gap-2.5 border-t border-border pt-4 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-full border border-border-2 text-[13.5px] cursor-pointer hover:bg-sunken"
            onClick={() => onFinish("practiced")}
          >
            もう一度
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-7 rounded-full sf-gradient-bg text-white text-[13.5px] font-bold cursor-pointer hover:brightness-105"
            onClick={() => onFinish("confident")}
          >
            できた — 次へ
          </button>
          <span className="ml-auto text-[11.5px] text-ink-4">
            「できた」で練習OKになり準備率に反映されます
          </span>
        </div>
      ) : (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-7 rounded-full sf-gradient-bg text-white text-[13.5px] font-bold cursor-pointer hover:brightness-105"
            onClick={() => onFinish(null)}
          >
            次の質問へ
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">
        {label}
      </div>
      <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}

/**
 * 改善点メモの追加と消し込み。 定型チップも自由入力も同じ 1 行として保存し、
 * 未解決分は次回この質問に答える直前に再表示される。
 */
export function FixNoteEditor({
  questionNo,
  notes,
  canEdit,
  onFixNoteChange,
  compact = false,
}: {
  questionNo: number;
  notes: FixNote[];
  canEdit: boolean;
  onFixNoteChange: (note: FixNote) => void;
  /** 質問ドロワー用: 見出しを小さくし、 入力欄を畳む。 */
  compact?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const history = useMemo(() => sortFixNotesForHistory(notes), [notes]);

  const add = async (text: string) => {
    const normalized = normalizeFixNoteText(text);
    if (!normalized || saving) return;
    setSaving(true);
    try {
      onFixNoteChange(await addFixNote(questionNo, normalized));
      setDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "改善点メモを保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async (note: FixNote) => {
    if (saving) return;
    setSaving(true);
    try {
      onFixNoteChange(await setFixNoteResolved(note.id, note.resolved_at == null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "改善点メモを更新できませんでした");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">
        Fix Notes ・ 改善点メモ{compact ? ` (${notes.length})` : ""}
      </div>
      {!compact ? (
        <p className="text-[11.5px] text-ink-4">
          気づいた改善点を残すと、次回この質問に答える直前に表示されます。克服したらチェックで消し込みます。
        </p>
      ) : null}
      {canEdit ? (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 定型チップは押すとその場で 1 行増える (トグルではないので Chip は使わない) */}
            {FIX_NOTE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={saving}
                className="px-2.5 py-1 rounded-full text-[12px] border border-border bg-card text-ink-2 cursor-pointer hover:bg-sunken inline-flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-default"
                onClick={() => void add(chip)}
              >
                <Plus size={11} />
                {chip}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add(draft);
              }}
              placeholder="自由入力（例: 案件規模を数字で言えるようにする）"
              className="h-8 text-[13px]"
            />
            <button
              type="button"
              disabled={saving || normalizeFixNoteText(draft) === ""}
              className="px-3 py-1.5 rounded-sm border border-border text-[12px] cursor-pointer hover:bg-sunken disabled:opacity-50 disabled:cursor-default shrink-0"
              onClick={() => void add(draft)}
            >
              追加
            </button>
          </div>
        </>
      ) : null}
      {history.length === 0 ? (
        <p className="text-[12px] text-ink-4">まだ改善点メモはありません。</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {history.map((note) => {
            const resolved = note.resolved_at != null;
            return (
              <li key={note.id} className="flex items-center gap-2">
                {canEdit ? (
                  <button
                    type="button"
                    disabled={saving}
                    aria-label={resolved ? "消し込みを取り消す" : "克服したので消し込む"}
                    className={cn(
                      "size-5 shrink-0 rounded-sm border inline-flex items-center justify-center cursor-pointer disabled:opacity-50",
                      resolved
                        ? "border-success bg-success/10 text-success"
                        : "border-border text-ink-4 hover:bg-sunken",
                    )}
                    onClick={() => void toggleResolved(note)}
                  >
                    {resolved ? <Check size={12} /> : null}
                  </button>
                ) : null}
                <span
                  className={cn(
                    "text-[12.5px]",
                    resolved ? "text-ink-4 line-through" : "text-ink-2",
                  )}
                >
                  {note.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
