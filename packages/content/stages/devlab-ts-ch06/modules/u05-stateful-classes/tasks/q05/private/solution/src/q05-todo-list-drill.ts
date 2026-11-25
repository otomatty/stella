// 問1 NoteBook。add(text) でメモを足し、その番号（1から）を返す。get(id) でメモを返す（なければ undefined）。count() で数を返す
//     例: add("買い物") → 1、get(1) → "買い物"
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class NoteBook {
  private notes: string[] = [];

  add(text: string): number {
    this.notes.push(text);
    return this.notes.length;
  }

  get(id: number): string | undefined {
    return this.notes[id - 1];
  }

  count(): number {
    return this.notes.length;
  }
}

// 問2 Playlist。add(song) で足す（何も返さない）。next() で先頭から順に曲を返し、最後まで行ったら先頭に戻る。曲がなければ undefined
//     例: add("A")、add("B") → next() は "A"、"B"、"A"…
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class Playlist {
  private songs: string[] = [];
  private position = 0;

  add(song: string): void {
    this.songs.push(song);
  }

  next(): string | undefined {
    if (this.songs.length === 0) {
      return undefined;
    }
    const song = this.songs[this.position % this.songs.length];
    this.position++;
    return song;
  }
}

// 問3 ShoppingCart。add(name, price, quantity = 1) で足す（同じ name なら個数を増やす。何も返さない）。remove(name)（何も返さない）。total() で合計金額を返す
//     例: add("りんご", 150, 2)、add("みかん", 80) → total() は 380
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class ShoppingCart {
  private lines: { name: string; price: number; quantity: number }[] = [];

  add(name: string, price: number, quantity = 1): void {
    const line = this.lines.find((l) => l.name === name);
    if (line === undefined) {
      this.lines.push({ name, price, quantity });
    } else {
      line.quantity += quantity;
    }
  }

  remove(name: string): void {
    this.lines = this.lines.filter((l) => l.name !== name);
  }

  total(): number {
    let sum = 0;
    for (const line of this.lines) {
      sum += line.price * line.quantity;
    }
    return sum;
  }
}

// 問4 Library。addBook(title)（何も返さない）。borrow(title) で貸し出す（ない本は "本がありません: <title>"、貸出中は "貸出中です: <title>" の Error。何も返さない）。giveBack(title)（何も返さない）。available() で貸し出せる本の配列を返す
//     例: addBook("A")、borrow("A") → available() は []
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中で持つ配列を返すときは、コピーを返してください。
export class Library {
  private books: { title: string; borrowed: boolean }[] = [];

  addBook(title: string): void {
    this.books.push({ title, borrowed: false });
  }

  borrow(title: string): void {
    const book = this.books.find((b) => b.title === title);
    if (book === undefined) {
      throw new Error(`本がありません: ${title}`);
    }
    if (book.borrowed) {
      throw new Error(`貸出中です: ${title}`);
    }
    book.borrowed = true;
  }

  giveBack(title: string): void {
    const book = this.books.find((b) => b.title === title);
    if (book !== undefined) {
      book.borrowed = false;
    }
  }

  available(): string[] {
    return this.books.filter((b) => !b.borrowed).map((b) => b.title);
  }
}

// 問5 Scoreboard。record(name, score) で記録（何も返さない）。best(name) でその人の最高点（なければ undefined）。top(n) で最高点の高い順に名前を n 人返す（同点は先に記録した人が先）
//     例: record("山田", 70)、record("佐藤", 90)、record("山田", 95) → top(1) は ["山田"]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中で持つ配列を返すときは、コピーを返してください。
export class Scoreboard {
  private bests: { [name: string]: number } = {};

  record(name: string, score: number): void {
    const current = this.bests[name];
    if (current === undefined || score > current) {
      this.bests[name] = score;
    }
  }

  best(name: string): number | undefined {
    return this.bests[name];
  }

  top(n: number): string[] {
    return Object.entries(this.bests)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name]) => name);
  }
}

// 問6 EventCalendar。add(date, title) で予定を足す（何も返さない）。on(date) でその日の予定の配列を、足した順に返す（なければ []）
//     例: add("2026-12-01", "会議") → on("2026-12-01") は ["会議"]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class EventCalendar {
  private events: { [date: string]: string[] } = {};

  add(date: string, title: string): void {
    this.events[date] = [...(this.events[date] ?? []), title];
  }

  on(date: string): string[] {
    return [...(this.events[date] ?? [])];
  }
}

// 問7 ParkingLot(capacity)。park(car) で停める。空きがなければ false、停められたら true。leave(car) で出る（何も返さない）。free() で空きの数を返す
//     例: new ParkingLot(1) で park("A") → true、park("B") → false
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class ParkingLot {
  private cars: string[] = [];

  constructor(private readonly capacity: number) {}

  park(car: string): boolean {
    if (this.cars.length >= this.capacity) {
      return false;
    }
    this.cars.push(car);
    return true;
  }

  leave(car: string): void {
    this.cars = this.cars.filter((c) => c !== car);
  }

  free(): number {
    return this.capacity - this.cars.length;
  }
}

// 問8 PriorityQueue。enqueue(task, priority)（何も返さない）。dequeue() で priority がいちばん大きいタスクを取り出して返す（同じなら先に入れた方）。空なら undefined
//     例: enqueue("a", 1)、enqueue("b", 5) → dequeue() は "b"
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class PriorityQueue {
  private tasks: { task: string; priority: number }[] = [];

  enqueue(task: string, priority: number): void {
    this.tasks.push({ task, priority });
  }

  dequeue(): string | undefined {
    let bestIndex = -1;
    for (const [i, entry] of this.tasks.entries()) {
      const best = this.tasks[bestIndex];
      if (best === undefined || entry.priority > best.priority) {
        bestIndex = i;
      }
    }
    const [removed] = this.tasks.splice(bestIndex, 1);
    return removed?.task;
  }
}

// 問9 Inbox。receive(from, text) で受け取る（何も返さない）。unreadCount() で未読の数。read(index) で index 番目（0から）を "from: text" で返して既読にする（範囲外は "メッセージがありません" の Error）
//     例: receive("山田", "こんにちは") → read(0) は "山田: こんにちは"
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class Inbox {
  private messages: { from: string; text: string; read: boolean }[] = [];

  receive(from: string, text: string): void {
    this.messages.push({ from, text, read: false });
  }

  unreadCount(): number {
    return this.messages.filter((m) => !m.read).length;
  }

  read(index: number): string {
    const message = this.messages[index];
    if (message === undefined) {
      throw new Error("メッセージがありません");
    }
    message.read = true;
    return `${message.from}: ${message.text}`;
  }
}

// 問10 Gradebook。add(student, score)（何も返さない）。average() で平均点（なければ 0）。passed(border) で border 点以上の生徒の名前を、足した順に返す
//     例: add("山田", 80)、add("佐藤", 50) → passed(60) は ["山田"]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中で持つ配列を返すときは、コピーを返してください。
export class Gradebook {
  private records: { student: string; score: number }[] = [];

  add(student: string, score: number): void {
    this.records.push({ student, score });
  }

  average(): number {
    if (this.records.length === 0) {
      return 0;
    }
    let total = 0;
    for (const r of this.records) {
      total += r.score;
    }
    return total / this.records.length;
  }

  passed(border: number): string[] {
    return this.records.filter((r) => r.score >= border).map((r) => r.student);
  }
}

// 問11 Elevator(floors)。最初は1階。goTo(floor) で移動する（1〜floors の外なら "その階はありません" の Error。何も返さない）。current() で今の階、history() で止まった階の配列（最初の1階を含む）を返す
//     例: new Elevator(5) で goTo(3) → history() は [1, 3]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中の配列のコピーを返してください。
export class Elevator {
  private stops: number[] = [1];

  constructor(private readonly floors: number) {}

  goTo(floor: number): void {
    if (floor < 1 || floor > this.floors) {
      throw new Error("その階はありません");
    }
    this.stops.push(floor);
  }

  current(): number {
    return this.stops[this.stops.length - 1] ?? 1;
  }

  history(): number[] {
    return [...this.stops];
  }
}

// 問12 VotingBox(options: readonly string[])。vote(option) で投票する（選択肢にないものは "選択肢にありません: <option>" の Error。何も返さない）。winner() で最多得票の選択肢を返す（同数なら options の先の方。票がなければ undefined）
//     例: new VotingBox(["A", "B"]) で vote("B") → winner() は "B"
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class VotingBox {
  private counts: number[];

  constructor(private readonly options: readonly string[]) {
    this.counts = options.map(() => 0);
  }

  vote(option: string): void {
    const index = this.options.indexOf(option);
    if (index === -1) {
      throw new Error(`選択肢にありません: ${option}`);
    }
    this.counts[index] = (this.counts[index] ?? 0) + 1;
  }

  winner(): string | undefined {
    let best = -1;
    let bestCount = 0;
    for (const [i, count] of this.counts.entries()) {
      if (count > bestCount) {
        best = i;
        bestCount = count;
      }
    }
    return this.options[best];
  }
}

// 問13 HistoryWallet。deposit(n) と withdraw(n)（残高不足は "残高が足りません" の Error）は、変えた後の残高を返す。history() で "+1000"、"-300" の形の履歴を返す
//     例: deposit(1000)、withdraw(300) → history() は ["+1000", "-300"]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中の配列のコピーを返してください。
export class HistoryWallet {
  private balance = 0;
  private entries: string[] = [];

  deposit(n: number): number {
    this.balance += n;
    this.entries.push(`+${n}`);
    return this.balance;
  }

  withdraw(n: number): number {
    if (n > this.balance) {
      throw new Error("残高が足りません");
    }
    this.balance -= n;
    this.entries.push(`-${n}`);
    return this.balance;
  }

  history(): string[] {
    return [...this.entries];
  }
}

// 問14 ChatRoom。join(name) と leave(name)（何も返さない）。post(name, text) で投稿する（参加していなければ "参加していません: <name>" の Error。何も返さない）。messages() で "name: text" の配列を返す
//     例: join("山田")、post("山田", "こんにちは") → messages() は ["山田: こんにちは"]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中の配列のコピーを返してください。
export class ChatRoom {
  private members: string[] = [];
  private posts: string[] = [];

  join(name: string): void {
    if (!this.members.includes(name)) {
      this.members.push(name);
    }
  }

  leave(name: string): void {
    this.members = this.members.filter((m) => m !== name);
  }

  post(name: string, text: string): void {
    if (!this.members.includes(name)) {
      throw new Error(`参加していません: ${name}`);
    }
    this.posts.push(`${name}: ${text}`);
  }

  messages(): string[] {
    return [...this.posts];
  }
}

// 問15 SeatReservation。reserve(seat, name)（予約済みなら "予約済みです: <seat>" の Error。何も返さない）。cancel(seat)（何も返さない）。seatsOf(name) でその人の席を、予約した順に返す
//     例: reserve("A1", "山田") → seatsOf("山田") は ["A1"]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中で持つ配列を返すときは、コピーを返してください。
export class SeatReservation {
  private seats: { [seat: string]: string } = {};

  reserve(seat: string, name: string): void {
    if (this.seats[seat] !== undefined) {
      throw new Error(`予約済みです: ${seat}`);
    }
    this.seats[seat] = name;
  }

  cancel(seat: string): void {
    const rest: { [seat: string]: string } = {};
    for (const [s, n] of Object.entries(this.seats)) {
      if (s !== seat) {
        rest[s] = n;
      }
    }
    this.seats = rest;
  }

  seatsOf(name: string): string[] {
    return Object.entries(this.seats)
      .filter(([, n]) => n === name)
      .map(([s]) => s);
  }
}

// 問16 TodoStore。add(title) で ToDo を足して id（1から）を返す。toggle(id) で完了と未完了を切り替える（なければ "ToDo がありません: <id>" の Error。何も返さない）。remaining() で未完了の数を返す
//     例: add("a")、add("b")、toggle(1) → remaining() は 1
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class TodoStore {
  private todos: { id: number; title: string; done: boolean }[] = [];

  add(title: string): number {
    const id = this.todos.length + 1;
    this.todos.push({ id, title, done: false });
    return id;
  }

  toggle(id: number): void {
    const todo = this.todos.find((t) => t.id === id);
    if (todo === undefined) {
      throw new Error(`ToDo がありません: ${id}`);
    }
    todo.done = !todo.done;
  }

  remaining(): number {
    return this.todos.filter((t) => !t.done).length;
  }
}

// 問17 LapTimer。start(t) で計測を始める（何も返さない）。lap(t) で前回（start か lap）からの差を返す。laps() でそれまでの差の配列を返す
//     例: start(1000)、lap(1500)、lap(1800) → laps() は [500, 300]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中の配列のコピーを返してください。
export class LapTimer {
  private last = 0;
  private records: number[] = [];

  start(t: number): void {
    this.last = t;
    this.records = [];
  }

  lap(t: number): number {
    const diff = t - this.last;
    this.last = t;
    this.records.push(diff);
    return diff;
  }

  laps(): number[] {
    return [...this.records];
  }
}

// 問18 RateLimiter(max, windowMs)。hit(time) は、time から windowMs ミリ秒前より後（time - windowMs < 記録した時刻）の受け付け回数が max 未満なら、受け付けて true。そうでなければ false
//     例: new RateLimiter(2, 1000) で hit(0)、hit(100) → true、hit(200) → false、hit(1100) → true
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class RateLimiter {
  private times: number[] = [];

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  hit(time: number): boolean {
    this.times = this.times.filter((t) => t > time - this.windowMs);
    if (this.times.length >= this.max) {
      return false;
    }
    this.times.push(time);
    return true;
  }
}

// 問19 UndoCounter。increment()（何も返さない）。undo() で直前の increment を取り消す（取り消すものがなければ何もしない）。value() で今の値を返す
//     例: increment() を2回、undo() → value() は 1
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class UndoCounter {
  private count = 0;
  private steps = 0;

  increment(): void {
    this.count++;
    this.steps++;
  }

  undo(): void {
    if (this.steps > 0) {
      this.count--;
      this.steps--;
    }
  }

  value(): number {
    return this.count;
  }
}

// 問20 TagIndex。tag(item, label) で item にタグを付ける（同じタグは1回だけ。何も返さない）。itemsWith(label) でそのタグの付いた item を、付けた順に返す。tagsOf(item) でその item のタグを返す
//     例: tag("記事1", "TS")、tag("記事2", "TS") → itemsWith("TS") は ["記事1", "記事2"]
// クラスが持つデータは private にし、外からはメソッドで読み書きできるようにしてください。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 中で持つ配列を返すときは、コピーを返してください。
export class TagIndex {
  private pairs: { item: string; label: string }[] = [];

  tag(item: string, label: string): void {
    if (!this.pairs.some((p) => p.item === item && p.label === label)) {
      this.pairs.push({ item, label });
    }
  }

  itemsWith(label: string): string[] {
    return this.pairs.filter((p) => p.label === label).map((p) => p.item);
  }

  tagsOf(item: string): string[] {
    return this.pairs.filter((p) => p.item === item).map((p) => p.label);
  }
}
