// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// ドア、照明、タイマー、チケットの状態を表す型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// どの型も、state や status で今の状態を見分ける判別可能なユニオン型になっている。
// 状態を変える関数は、元のオブジェクトを書き換えずに、新しい状態のオブジェクトを返す。今の状態では変えられないときは、受け取った状態をそのまま返す。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

export type Light = { state: "off" } | { state: "on"; brightness: number };

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

// 問1 開いているドアを閉める（closed にする）。それ以外はそのまま
//     例: closeDoor({ state: "open" }) → { state: "closed" }
export function closeDoor() {}

// 問2 閉まっているドアを開ける（open にする）。鍵がかかっていれば開けられない（そのまま）
//     例: openDoor({ state: "closed" }) → { state: "open" }
export function openDoor() {}

// 問3 閉まっているドアに鍵 key をかける（locked にする）。開いていればかけられない（そのまま）
//     例: lockDoor({ state: "closed" }, "A") → { state: "locked", key: "A" }
export function lockDoor() {}

// 問4 鍵のかかったドアを、同じ鍵 key なら開錠して closed にする。鍵が違う、または鍵がかかっていなければそのまま
//     例: unlockDoor({ state: "locked", key: "A" }, "A") → { state: "closed" }
export function unlockDoor() {}

// 問5 ドアの状態を「開いている」「閉まっている」「鍵がかかっている」で返す
//     例: doorText({ state: "locked", key: "A" }) → "鍵がかかっている"
export function doorText() {}

// 問6 消えている照明を明るさ 100 で点ける。点いていればそのまま
//     例: turnOn({ state: "off" }) → { state: "on", brightness: 100 }
export function turnOn() {}

// 問7 照明を消す（off にする）
//     例: turnOff({ state: "on", brightness: 40 }) → { state: "off" }
export function turnOff() {}

// 問8 点いている照明の明るさを amount だけ下げる。0 以下になったら消す（off にする）。消えていればそのまま
//     例: dim({ state: "on", brightness: 80 }, 30) → { state: "on", brightness: 50 }
export function dim() {}

// 問9 照明の状態を「消灯」か「点灯（80%）」で返す
//     例: lightText({ state: "on", brightness: 80 }) → "点灯（80%）"
export function lightText() {}

// 問10 タイマーを動かす。idle なら startedAt を now にして running に。paused なら止まっていた分を引いて（startedAt = now - elapsed）running に。running ならそのまま
//     例: startTimer({ state: "idle" }, 1000) → { state: "running", startedAt: 1000 }
export function startTimer() {}

// 問11 動いているタイマーを止める。elapsed は now - startedAt。running でなければそのまま
//     例: pauseTimer({ state: "running", startedAt: 1000 }, 1500) → { state: "paused", elapsed: 500 }
export function pauseTimer() {}

// 問12 どの状態からでも idle に戻す
//     例: resetTimer({ state: "paused", elapsed: 300 }) → { state: "idle" }
export function resetTimer() {}

// 問13 経過時間を返す。idle は 0、running は now - startedAt、paused は elapsed
//     例: elapsedOf({ state: "running", startedAt: 1000 }, 1800) → 800
export function elapsedOf() {}

// 問14 open か assigned のチケットを、assignee の担当にする（assigned にする）。closed ならそのまま
//     例: assignTicket({ status: "open", title: "バグ" }, "山田") → { status: "assigned", title: "バグ", assignee: "山田" }
export function assignTicket() {}

// 問15 open か assigned のチケットを、resolution を付けて closed にする。closed ならそのまま
//     例: closeTicket({ status: "open", title: "バグ" }, "修正済み") → { status: "closed", title: "バグ", resolution: "修正済み" }
export function closeTicket() {}

// 問16 closed のチケットを open に戻す。それ以外はそのまま
//     例: reopen({ status: "closed", title: "バグ", resolution: "修正" }) → { status: "open", title: "バグ" }
export function reopen() {}

// 問17 assigned なら担当者の名前、それ以外は undefined を返す
//     例: assigneeOf({ status: "assigned", title: "バグ", assignee: "山田" }) → "山田"
export function assigneeOf() {}

// 問18 「[未対応] タイトル」「[担当: 山田] タイトル」「[完了: 修正済み] タイトル」を返す
//     例: ticketText({ status: "open", title: "バグ" }) → "[未対応] バグ"
export function ticketText() {}

// 問19 closed でなければ true
//     例: canEdit({ status: "open", title: "バグ" }) → true
export function canEdit() {}

// 問20 closed でないチケットの数を返す
//     例: countUnfinished([open, assigned, closed]) → 2
export function countUnfinished() {}
