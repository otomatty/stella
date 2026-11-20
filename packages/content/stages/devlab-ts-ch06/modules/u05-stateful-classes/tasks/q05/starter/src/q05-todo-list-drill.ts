// 06-q05 状態を持つクラス ドリル
//
// 教材: https://typescriptbook.jp/reference/object-oriented/class/access-modifiers
//       https://typescriptbook.jp/reference/object-oriented/class/methods
//
// ★総合問題（ToDoリスト）で使う書き方を繰り返します。次の20個のクラスを書いてください。
// どのクラスも、中で持つデータは private にし、外からはメソッドでしか読み書きできないようにする。
// 配列を返すメソッドは、中の配列そのものではなく、コピーを返す。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けること。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 NoteBook。add(text) でメモを足し、その番号（1から）を返す。get(id) でメモを返す（なければ undefined）。count() で数を返す
//     例: add("買い物") → 1、get(1) → "買い物"
export class NoteBook {}

// 問2 Playlist。add(song) で足す（何も返さない）。next() で先頭から順に曲を返し、最後まで行ったら先頭に戻る。曲がなければ undefined
//     例: add("A")、add("B") → next() は "A"、"B"、"A"…
export class Playlist {}

// 問3 ShoppingCart。add(name, price, quantity = 1) で足す（同じ name なら個数を増やす。何も返さない）。remove(name)（何も返さない）。total() で合計金額を返す
//     例: add("りんご", 150, 2)、add("みかん", 80) → total() は 380
export class ShoppingCart {}

// 問4 Library。addBook(title)（何も返さない）。borrow(title) で貸し出す（ない本は "本がありません: <title>"、貸出中は "貸出中です: <title>" の Error。何も返さない）。giveBack(title)（何も返さない）。available() で貸し出せる本の配列を返す
//     例: addBook("A")、borrow("A") → available() は []
export class Library {}

// 問5 Scoreboard。record(name, score) で記録（何も返さない）。best(name) でその人の最高点（なければ undefined）。top(n) で最高点の高い順に名前を n 人返す（同点は先に記録した人が先）
//     例: record("山田", 70)、record("佐藤", 90)、record("山田", 95) → top(1) は ["山田"]
export class Scoreboard {}

// 問6 EventCalendar。add(date, title) で予定を足す（何も返さない）。on(date) でその日の予定の配列を、足した順に返す（なければ []）
//     例: add("2026-12-01", "会議") → on("2026-12-01") は ["会議"]
export class EventCalendar {}

// 問7 ParkingLot(capacity)。park(car) で停める。空きがなければ false、停められたら true。leave(car) で出る（何も返さない）。free() で空きの数を返す
//     例: new ParkingLot(1) で park("A") → true、park("B") → false
export class ParkingLot {}

// 問8 PriorityQueue。enqueue(task, priority)（何も返さない）。dequeue() で priority がいちばん大きいタスクを取り出して返す（同じなら先に入れた方）。空なら undefined
//     例: enqueue("a", 1)、enqueue("b", 5) → dequeue() は "b"
export class PriorityQueue {}

// 問9 Inbox。receive(from, text) で受け取る（何も返さない）。unreadCount() で未読の数。read(index) で index 番目（0から）を "from: text" で返して既読にする（範囲外は "メッセージがありません" の Error）
//     例: receive("山田", "こんにちは") → read(0) は "山田: こんにちは"
export class Inbox {}

// 問10 Gradebook。add(student, score)（何も返さない）。average() で平均点（なければ 0）。passed(border) で border 点以上の生徒の名前を、足した順に返す
//     例: add("山田", 80)、add("佐藤", 50) → passed(60) は ["山田"]
export class Gradebook {}

// 問11 Elevator(floors)。最初は1階。goTo(floor) で移動する（1〜floors の外なら "その階はありません" の Error。何も返さない）。current() で今の階、history() で止まった階の配列（最初の1階を含む）を返す
//     例: new Elevator(5) で goTo(3) → history() は [1, 3]
export class Elevator {}

// 問12 VotingBox(options: readonly string[])。vote(option) で投票する（選択肢にないものは "選択肢にありません: <option>" の Error。何も返さない）。winner() で最多得票の選択肢を返す（同数なら options の先の方。票がなければ undefined）
//     例: new VotingBox(["A", "B"]) で vote("B") → winner() は "B"
export class VotingBox {}

// 問13 HistoryWallet。deposit(n) と withdraw(n)（残高不足は "残高が足りません" の Error）は、変えた後の残高を返す。history() で "+1000"、"-300" の形の履歴を返す
//     例: deposit(1000)、withdraw(300) → history() は ["+1000", "-300"]
export class HistoryWallet {}

// 問14 ChatRoom。join(name) と leave(name)（何も返さない）。post(name, text) で投稿する（参加していなければ "参加していません: <name>" の Error。何も返さない）。messages() で "name: text" の配列を返す
//     例: join("山田")、post("山田", "こんにちは") → messages() は ["山田: こんにちは"]
export class ChatRoom {}

// 問15 SeatReservation。reserve(seat, name)（予約済みなら "予約済みです: <seat>" の Error。何も返さない）。cancel(seat)（何も返さない）。seatsOf(name) でその人の席を、予約した順に返す
//     例: reserve("A1", "山田") → seatsOf("山田") は ["A1"]
export class SeatReservation {}

// 問16 TodoStore。add(title) で ToDo を足して id（1から）を返す。toggle(id) で完了と未完了を切り替える（なければ "ToDo がありません: <id>" の Error。何も返さない）。remaining() で未完了の数を返す
//     例: add("a")、add("b")、toggle(1) → remaining() は 1
export class TodoStore {}

// 問17 LapTimer。start(t) で計測を始める（何も返さない）。lap(t) で前回（start か lap）からの差を返す。laps() でそれまでの差の配列を返す
//     例: start(1000)、lap(1500)、lap(1800) → laps() は [500, 300]
export class LapTimer {}

// 問18 RateLimiter(max, windowMs)。hit(time) は、time から windowMs ミリ秒前より後（time - windowMs < 記録した時刻）の受け付け回数が max 未満なら、受け付けて true。そうでなければ false
//     例: new RateLimiter(2, 1000) で hit(0)、hit(100) → true、hit(200) → false、hit(1100) → true
export class RateLimiter {}

// 問19 UndoCounter。increment()（何も返さない）。undo() で直前の increment を取り消す（取り消すものがなければ何もしない）。value() で今の値を返す
//     例: increment() を2回、undo() → value() は 1
export class UndoCounter {}

// 問20 TagIndex。tag(item, label) で item にタグを付ける（同じタグは1回だけ。何も返さない）。itemsWith(label) でそのタグの付いた item を、付けた順に返す。tagsOf(item) でその item のタグを返す
//     例: tag("記事1", "TS")、tag("記事2", "TS") → itemsWith("TS") は ["記事1", "記事2"]
export class TagIndex {}
