// 問1 Animal(name) の speak() は "…"。Animal を継承した Dog の speak() は "ポチ: ワン" を返す（name を使う）
//     例: new Dog("ポチ").speak() → "ポチ: ワン"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// ここに Animal と Dog を書く

// 問2 Shape の area() は 0。Shape を継承した Square(size) の area() は size × size
//     例: new Square(3).area() → 9
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
// ここに Shape と Square を書く

// 問3 Staff(name, salary) の pay() は salary。Staff を継承した PartTimer(name, hourly, hours) は super(name, 0) を呼び、pay() は hourly × hours
//     例: new PartTimer("鈴木", 1200, 10).pay() → 12000
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Staff と PartTimer を書く

// 問4 Vehicle(wheels) の describe() は "車輪 4つ"。Vehicle を継承した Bicycle の constructor は引数なしで super(2) を呼ぶ
//     例: new Bicycle().describe() → "車輪 2つ"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Vehicle と Bicycle を書く

// 問5 Wallet(balance) の withdraw(n) は残高を減らして返す（残高より多ければ "残高が足りません" の Error）。Wallet を継承した OverdraftAccount(balance, limit) は、残高が -limit になるまで引き出せる。balance は protected にする
//     例: new OverdraftAccount(100, 500).withdraw(300) → -200
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
// ここに Wallet と OverdraftAccount を書く

// 問6 Logger の prefix() は "[LOG]"、format(message) は "prefix() + 半角スペース + message"。Logger を継承した ErrorLogger は prefix() だけを "[ERROR]" に上書きする
//     例: new ErrorLogger().format("失敗") → "[ERROR] 失敗"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Logger と ErrorLogger を書く

// 問7 Greeter の greet(name) は "こんにちは、◯◯さん"。Greeter を継承した PoliteGreeter の greet(name) は、親の結果の後ろに "。よろしくお願いします" を足す（super.greet を使う）
//     例: new PoliteGreeter().greet("山田") → "こんにちは、山田さん。よろしくお願いします"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Greeter と PoliteGreeter を書く

// 問8 Counter の value は 0 から。increment() で1増やして返す。Counter を継承した DoubleCounter の increment() は2増やして返す（super.increment() を2回呼んでもよい）
//     例: new DoubleCounter().increment() → 2
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Counter と DoubleCounter を書く

// 問9 Product(name, price) の priceWithTax() は税込（10%。1円未満は切り捨て）。Product を継承した Food は税率 8% にする
//     例: new Food("パン", 200).priceWithTax() → 216
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Product と Food を書く

// 問10 Point2D(x, y) の label() は "(1, 2)"。Point2D を継承した Point3D(x, y, z) の label() は "(1, 2, 3)"
//     例: new Point3D(1, 2, 3).label() → "(1, 2, 3)"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
// ここに Point2D と Point3D を書く

// 問11 Creature(name)、それを継承した Fish と Bird を書き、関数 kindOf(creature: Creature) で Fish なら "魚"、Bird なら "鳥"、それ以外は "その他" を返す（instanceof を使う）
//     例: kindOf(new Bird("ピーちゃん")) → "鳥"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Creature、Fish、Bird と関数 kindOf を書く

// 問12 User(name) の role() は "一般"。User を継承した Admin の role() は "管理者"。関数 roles(users: readonly User[]): string[] は "山田: 一般" の形で並べる
//     例: roles([new User("山田"), new Admin("佐藤")]) → ["山田: 一般", "佐藤: 管理者"]
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに User、Admin と関数 roles を書く

// 問13 Rectangle(width, height) の area()。Rectangle を継承した SquareRect(size) は super(size, size) を呼ぶ
//     例: new SquareRect(4).area() → 16
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Rectangle と SquareRect を書く

// 問14 Message(text) の format() は text。Message を継承した UrgentMessage の format() は "【至急】" + 親の結果
//     例: new UrgentMessage("集合").format() → "【至急】集合"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 親の format() は super.format() で呼んでください。
// ここに Message と UrgentMessage を書く

// 問15 Timer(seconds) の label() は "60秒"。Timer を継承した Countdown の label() は "残り60秒"
//     例: new Countdown(60).label() → "残り60秒"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Timer と Countdown を書く

// 問16 Character(hp) の damage(n) は hp を n 減らす（0 より小さくしない。何も返さない）。hp は外から読める。Character を継承した Warrior の damage(n) は、半分（切り捨て）しか減らない
//     例: new Warrior(100) に damage(30) → hp は 85
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Character と Warrior を書く

// 問17 Notifier の send(message) は "通知: message"。Notifier を継承した EmailNotifier(address) の send(message) は "メール(address): message"
//     例: new EmailNotifier("a@example.com").send("完了") → "メール(a@example.com): 完了"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
// ここに Notifier と EmailNotifier を書く

// 問18 AdmissionTicket(price) の finalPrice() は price。それを継承した ChildTicket の finalPrice() は半額（切り捨て）
//     例: new ChildTicket(1500).finalPrice() → 750
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに AdmissionTicket と ChildTicket を書く

// 問19 Collection の items（文字列の配列、初期値は []）に、add(item) で足す（何も返さない）。Collection を継承した UniqueCollection の add は、すでにあるものは足さない
//     例: UniqueCollection に add("a") を2回 → items は ["a"]
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Collection と UniqueCollection を書く

// 問20 Polygon(sides) の describe() は "5角形"。Polygon を継承した Triangle の constructor は引数なしで super(3) を呼ぶ
//     例: new Triangle().describe() → "3角形"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// ここに Polygon と Triangle を書く
