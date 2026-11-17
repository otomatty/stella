// 問1
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

// 問2
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

// 問3
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

// 問4
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

// 問5
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

// 問6
export class EventCalendar {
  private events: { [date: string]: string[] } = {};

  add(date: string, title: string): void {
    this.events[date] = [...(this.events[date] ?? []), title];
  }

  on(date: string): string[] {
    return [...(this.events[date] ?? [])];
  }
}

// 問7
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

// 問8
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

// 問9
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

// 問10
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

// 問11
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

// 問12
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

// 問13
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

// 問14
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

// 問15
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

// 問16
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

// 問17
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

// 問18
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

// 問19
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

// 問20
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
