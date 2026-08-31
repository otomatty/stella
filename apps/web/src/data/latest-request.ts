/**
 * 「最後に始めた読み出しだけを採用する」ための版番号 (取りこぼしの捨て方)。
 *
 * 読み出しが重なったとき、古いほうの結果で state を上書きすると画面が巻き戻る。
 * それを避けるため各 Hook は版番号を持っていたが、**追い越された呼び出しが空配列を
 * 返す**のは別の間違いだった: 呼び出し側は「見つからなかった」と受け取る。実際、
 * スキルツリーの「ここから始める」は取り直した一覧から遷移先を決めるので、
 * 開始したのにトーストだけ出てレッスンが開かない、という形で表に出る (PR #289)。
 *
 * ここでは 2 つを分けて扱う:
 * - **state に書き戻してよいか** … `isCurrent` (追い越されたら書かない。従来どおり)
 * - **呼び出し側へ何を返すか** … `joinLatest` (新しい読み出しの結果に相乗りする)
 *
 * 相乗り先がさらに追い越されても、その呼び出しが同じように次へ繋ぐので、最後に
 * 始まった読み出しの結果に収束する。
 */
export interface LatestRequest<T> {
  /** 新しい読み出しを始める。返った版番号を以降の判定に使う。 */
  begin(): number;
  /** この版がまだ最新か (= state に書き戻してよいか)。 */
  isCurrent(id: number): boolean;
  /** 進行中の読み出しを登録する (`begin` で採った版番号とセットで)。 */
  track(id: number, promise: Promise<T>): void;
  /**
   * 追い越された呼び出しの戻り値。新しい読み出しがあればその結果を待って返し、
   * 無ければ `fallback` (登録前に追い越された・追い越しが同期で終わった場合)。
   */
  joinLatest(id: number, fallback: T): Promise<T>;
}

export function createLatestRequest<T>(): LatestRequest<T> {
  let current = 0;
  let tracked: { id: number; promise: Promise<T> } | null = null;
  return {
    begin: () => ++current,
    isCurrent: (id) => id === current,
    track: (id, promise) => {
      tracked = { id, promise };
    },
    joinLatest: (id, fallback) =>
      tracked && tracked.id !== id ? tracked.promise : Promise.resolve(fallback),
  };
}
