---
sourceRefs: [SRC-typescriptbook-values-types-variables-literal-types]
---
# レッスン1-7 q07 決まった値だけを受け付ける型

## このレッスンの目標

- [ ] 候補を限定した型で、条件に合う値を返せる
- [ ] よくある間違いを説明できる
- [ ] ヒントを読んで、一問ずつ確認して提出できる

実装は「01章の問題」の q07 のファイルで行います。
知識問題は理解の自己確認です。選考の判定には使いません。

## 1-7-1 決まった値だけを受け付ける型

> **リテラル型で候補を決め、条件に合った値をその場で返します。**

リテラル型は、決まった値だけを受け付ける型です。
`string` はどんな文字列でも受け付けます。
`"card"` と値そのものを型に書けば、その値だけを受け付けます。
`"card" | "cash"` は、二つのうちどれか一つの値です。
型を `|` でつなぐ書き方をユニオン型と呼びます。
支払い方法など、候補が決まる業務で打ち間違いに気付けます。

```ts
// 関数 paymentLabel を作る。候補の method を受け取り、文字列を返す
function paymentLabel(method: "card" | "cash"): string {
  // method が "card" と等しいなら "カード払い"、そうでなければ "現金払い" を返す
  return method === "card" ? "カード払い" : "現金払い";
}
// paymentLabel に "cash" を渡した結果を表示する
console.log(paymentLabel("cash"));
// 結果: "現金払い"
```

よくある間違いは、型の `|` を、条件の「または」の `||` にすることです。
型では一本にします。`paymentLabel("bank")` も候補外なのでエラーです。
数値も `10 | 20 | 50` のように限定できます。
`true` だけの型も作れます。`true | false` は `boolean` と同じです。

`return` を実行すると、その場で関数が終わります。
`if` の中で返せば、その条件に合うときは後ろを実行しません。

```ts
// 関数 stockLevel を作る。在庫数を受け取り、決まった状態を返す
function stockLevel(stock: number): "なし" | "少ない" | "十分" {
  // もし stock が 0 と等しいなら
  if (stock === 0) {
    // "なし" を返す
    return "なし";
  }
  // もし stock が 10 より小さいなら
  if (stock < 10) {
    // "少ない" を返す
    return "少ない";
  }
  // "十分" を返す
  return "十分";
}
// stockLevel に 0 と 3 と 50 を渡した結果を表示する
console.log(stockLevel(0), stockLevel(3), stockLevel(50));
// 結果: "なし" "少ない" "十分"
```

最後の行に来るのは、前の二つの条件に合わなかったときだけです。
よくある間違いは、`let level = "十分"` に結果を入れてから返すことです。
型注釈のないこの変数は `string` なので、候補を限定した戻り値には使えません。
候補を直接返すか、変数にも `"なし" | "十分"` のように型を付けます。

```ts
// 標準サイズ SIZE を作り、"M" を入れる
const SIZE = "M";
// SIZE を表示する
console.log(SIZE);
// 結果: "M"。SIZE の型も "M"
```

型注釈なしで `const` に文字列を入れると、型もその値そのものになります。
`let size = "M"` なら型は `string` です。
VS Code で変数の名前にマウスを載せると、型を確かめられます。

参考: サバイバルTypeScript [literal-types](https://typescriptbook.jp/reference/values-types-variables/literal-types)。説明・業務例・知識問題は教材用に構成しています。

## 問題ごとのヒント

### 問 1 "on" なら "off"、"off" なら "on" を返す

**テストで確かめる値**

- `toggle("on")` は `"off"`
- `toggle("off")` は `"on"`

**ヒント 1 日本語の手順**

```ts
// 関数 toggle を作る。"on" か "off" の state を受け取り、"on" か "off" を返す
export function toggle() {
  // state が "on" と等しいなら "off"、そうでなければ "on" を返す
}
```

**ヒント 2 コードへの直し方**

「"on" か "off"」は、型で `"on" | "off"` と書きます。引数の型と戻り値の型の両方に書きます。関数の中は、このまとめのサンプルの `paymentLabel` と同じ条件演算子の形です。

### 問 2 正なら 1、負なら -1、0 なら 0 を返す

**テストで確かめる値**

- `signOf(-5)` は `-1`
- `signOf(0)` は `0`
- `signOf(8)` は `1`

**ヒント 1 日本語の手順**

```ts
// 関数 signOf を作る。数の n を受け取り、-1 か 0 か 1 を返す
export function signOf() {
  // もし n が 0 より大きいなら
  //   1 を返す
  // もし n が 0 より小さいなら
  //   -1 を返す
  // 0 を返す
}
```

**ヒント 2 コードへの直し方**

どんな数でも受け取るので、引数の型は `number` です。戻り値の型は `-1 | 0 | 1` です。`if` の中で返す形は、このまとめのサンプルの `stockLevel` と同じです。

### 問 3 偶数なら "表"、奇数なら "裏" を返す

**テストで確かめる値**

- `coinSide(4)` は `"表"`
- `coinSide(3)` は `"裏"`

**ヒント 1 日本語の手順**

```ts
// 関数 coinSide を作る。数の n を受け取り、"表" か "裏" を返す
export function coinSide() {
  // n を 2 で割った余りが 0 と等しいなら "表"、そうでなければ "裏" を返す
}
```

**ヒント 2 コードへの直し方**

戻り値の型は `"表" | "裏"` です。偶数は「2 で割った余りが 0」です。関数の中は、このまとめの `paymentLabel` と同じ条件演算子の形です。

### 問 4 曜日の番号が土日なら "休日"、それ以外は "平日" を返す

**テストで確かめる値**

- `dayType(0)` は `"休日"`。日曜
- `dayType(3)` は `"平日"`。水曜

**ヒント 1 日本語の手順**

```ts
// 関数 dayType を作る。数の day を受け取り、"平日" か "休日" を返す
export function dayType() {
  // day が 0 と等しい、または day が 6 と等しいなら "休日"、そうでなければ "平日" を返す
}
```

**ヒント 2 コードへの直し方**

「または」は `||` です。型の `|`（1 本）と取り違えないようにします。戻り値の型は `"平日" | "休日"` です。並べる順番は、どちらが先でもかまいません。

### 問 5 信号の次の色を返す

**テストで確かめる値**

- `nextLight("green")` は `"yellow"`
- `nextLight("yellow")` は `"red"`
- `nextLight("red")` は `"green"`。最初に戻る

**ヒント 1 日本語の手順**

```ts
// 関数 nextLight を作る。"green" か "yellow" か "red" の light を受け取り、"green" か "yellow" か "red" を返す
export function nextLight() {
  // もし light が "green" と等しいなら
  //   "yellow" を返す
  // もし light が "yellow" と等しいなら
  //   "red" を返す
  // "green" を返す
}
```

**ヒント 2 コードへの直し方**

3 つ以上の値も `|` でつなげます。最後の行まで来るのは `"red"` のときだけなので、比べずに返せます。このまとめのサンプルの `stockLevel` と同じ形です。

### 問 6 80点以上は "A"、60点以上は "B"、それ未満は "C" を返す

**テストで確かめる値**

- `gradeOf(80)` は `"A"`。ちょうど 80 点は A
- `gradeOf(75)` は `"B"`
- `gradeOf(10)` は `"C"`

**ヒント 1 日本語の手順**

```ts
// 関数 gradeOf を作る。数の score を受け取り、"A" か "B" か "C" を返す
export function gradeOf() {
  // もし score が 80 以上なら
  //   "A" を返す
  // もし score が 60 以上なら
  //   "B" を返す
  // "C" を返す
}
```

**ヒント 2 コードへの直し方**

「以上」は `>=` です。上から順に比べます。80 点以上は 1 つ目の `if` で返るので、2 つ目の `if` に来るのは 80 点未満だけです。

### 問 7 ステータスコード 200、404、500 のどれかを受け取り、200 なら true を返す

**テストで確かめる値**

- `isSuccess(200)` は `true`
- `isSuccess(404)` は `false`

**ヒント 1 日本語の手順**

```ts
// 関数 isSuccess を作る。200 か 404 か 500 の code を受け取り、true か false を返す
export function isSuccess() {
  // code が 200 と等しいか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

数のリテラル型も `|` でつなげます。引数の型は `200 | 404 | 500` です。「true か false」は `boolean` です。比べた結果は `true` か `false` なので、そのまま返せます。

### 問 8 "S" なら "小"、"M" なら "中"、"L" なら "大" を返す

**テストで確かめる値**

- `sizeLabel("S")` は `"小"`
- `sizeLabel("M")` は `"中"`
- `sizeLabel("L")` は `"大"`

**ヒント 1 日本語の手順**

```ts
// 関数 sizeLabel を作る。"S" か "M" か "L" の size を受け取り、"小" か "中" か "大" を返す
export function sizeLabel() {
  // もし size が "S" と等しいなら
  //   "小" を返す
  // もし size が "M" と等しいなら
  //   "中" を返す
  // "大" を返す
}
```

**ヒント 2 コードへの直し方**

受け取る値と返す値で、別のリテラル型を書きます。引数は `"S" | "M" | "L"`、戻り値は `"小" | "中" | "大"` です。関数の中は問5 と同じ形です。

### 問 9 反対の方角を返す

**テストで確かめる値**

- `opposite("north")` は `"south"`
- `opposite("east")` は `"west"`
- `opposite("west")` は `"east"`

**ヒント 1 日本語の手順**

```ts
// 関数 opposite を作る。"north" か "south" か "east" か "west" の direction を受け取り、同じ 4 つのどれかを返す
export function opposite() {
  // もし direction が "north" と等しいなら
  //   "south" を返す
  // もし direction が "south" と等しいなら
  //   "north" を返す
  // もし direction が "east" と等しいなら
  //   "west" を返す
  // "east" を返す
}
```

**ヒント 2 コードへの直し方**

引数と戻り値は、同じ `"north" | "south" | "east" | "west"` です。最後の行まで来るのは `"west"` のときだけです。

### 問 10 true なら "yes"、false なら "no" を返す

**テストで確かめる値**

- `answerOf(true)` は `"yes"`
- `answerOf(false)` は `"no"`

**ヒント 1 日本語の手順**

```ts
// 関数 answerOf を作る。true か false の flag を受け取り、"yes" か "no" を返す
export function answerOf() {
  // flag が true なら "yes"、そうでなければ "no" を返す
}
```

**ヒント 2 コードへの直し方**

「true か false」は `boolean` です。「flag が true なら」は、`flag` だけで条件になります（q01 の問15）。

### 問 11 優先度 1、2、3 を受け取り、1 なら "高"、2 なら "中"、3 なら "低" を返す

**テストで確かめる値**

- `priorityLabel(1)` は `"高"`
- `priorityLabel(3)` は `"低"`

**ヒント 1 日本語の手順**

```ts
// 関数 priorityLabel を作る。1 か 2 か 3 の level を受け取り、"高" か "中" か "低" を返す
export function priorityLabel() {
  // もし level が 1 と等しいなら
  //   "高" を返す
  // もし level が 2 と等しいなら
  //   "中" を返す
  // "低" を返す
}
```

**ヒント 2 コードへの直し方**

引数は数のリテラル型 `1 | 2 | 3`、戻り値は文字列のリテラル型 `"高" | "中" | "低"` です。

### 問 12 サイコロの目を受け取り、6 なら true を返す

**テストで確かめる値**

- `rollAgain(6)` は `true`
- `rollAgain(1)` は `false`

**ヒント 1 日本語の手順**

```ts
// 関数 rollAgain を作る。1 か 2 か 3 か 4 か 5 か 6 の face を受け取り、true か false を返す
export function rollAgain() {
  // face が 6 と等しいか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「1〜6」のような範囲の書き方はないので、6 つの値を `|` でつなぎます。関数の中は問7 と同じ形です。

### 問 13 "left" なら x を1減らし、"right" なら1増やした値を返す

**テストで確かめる値**

- `moveX(5, "left")` は `4`
- `moveX(5, "right")` は `6`

**ヒント 1 日本語の手順**

```ts
// 関数 moveX を作る。数の x と、"left" か "right" の direction を受け取り、数を返す
export function moveX() {
  // direction が "left" と等しいなら x から 1 を引いた数、そうでなければ x に 1 を足した数を返す
}
```

**ヒント 2 コードへの直し方**

引数が 2 つあり、型が違います。1 つ目は `number`、2 つ目は `"left" | "right"` です。返す値はどんな数にもなるので、戻り値は `number` です。

### 問 14 "light" なら "ライトモード"、"dark" なら "ダークモード" を返す

**テストで確かめる値**

- `modeLabel("light")` は `"ライトモード"`
- `modeLabel("dark")` は `"ダークモード"`

**ヒント 1 日本語の手順**

```ts
// 関数 modeLabel を作る。"light" か "dark" の mode を受け取り、"ライトモード" か "ダークモード" を返す
export function modeLabel() {
  // mode が "light" と等しいなら "ライトモード"、そうでなければ "ダークモード" を返す
}
```

**ヒント 2 コードへの直し方**

日本語の文字列もリテラル型にできます。戻り値は `"ライトモード" | "ダークモード"` です。関数の中は問1 と同じ形です。

### 問 15 true なら 1、false なら 0 を返す

**テストで確かめる値**

- `bitOf(true)` は `1`
- `bitOf(false)` は `0`

**ヒント 1 日本語の手順**

```ts
// 関数 bitOf を作る。true か false の flag を受け取り、0 か 1 を返す
export function bitOf() {
  // flag が true なら 1、そうでなければ 0 を返す
}
```

**ヒント 2 コードへの直し方**

引数は `boolean`、戻り値は `0 | 1` です。関数の中は問10 と同じ形です。

### 問 16 月から季節を返す

**テストで確かめる値**

- `seasonOf(4)` は `"春"`
- `seasonOf(8)` は `"夏"`
- `seasonOf(11)` は `"秋"`
- `seasonOf(1)` は `"冬"`
- `seasonOf(12)` は `"冬"`

**ヒント 1 日本語の手順**

```ts
// 関数 seasonOf を作る。数の month を受け取り、"春" か "夏" か "秋" か "冬" を返す
export function seasonOf() {
  // もし month が 3 以上、かつ month が 5 以下なら
  //   "春" を返す
  // もし month が 6 以上、かつ month が 8 以下なら
  //   "夏" を返す
  // もし month が 9 以上、かつ month が 11 以下なら
  //   "秋" を返す
  // "冬" を返す
}
```

**ヒント 2 コードへの直し方**

「かつ」は `&&`、「以下」は `<=` です（q02 の問16 と同じ形）。12 月・1 月・2 月はどの `if` にも当てはまらず、最後の行に来ます。

### 問 17 a が小さければ -1、等しければ 0、大きければ 1 を返す

**テストで確かめる値**

- `compare(2, 5)` は `-1`
- `compare(5, 5)` は `0`
- `compare(9, 5)` は `1`

**ヒント 1 日本語の手順**

```ts
// 関数 compare を作る。数の a と、数の b を受け取り、-1 か 0 か 1 を返す
export function compare() {
  // もし a が b より小さいなら
  //   -1 を返す
  // もし a が b より大きいなら
  //   1 を返す
  // 0 を返す
}
```

**ヒント 2 コードへの直し方**

問2 と同じ形で、比べる相手が 0 から `b` に変わっただけです。戻り値の型も同じ `-1 | 0 | 1` です。

### 問 18 "GET" なら "取得"、"POST" なら "作成"、"DELETE" なら "削除" を返す

**テストで確かめる値**

- `methodLabel("GET")` は `"取得"`
- `methodLabel("POST")` は `"作成"`
- `methodLabel("DELETE")` は `"削除"`

**ヒント 1 日本語の手順**

```ts
// 関数 methodLabel を作る。"GET" か "POST" か "DELETE" の method を受け取り、"取得" か "作成" か "削除" を返す
export function methodLabel() {
  // もし method が "GET" と等しいなら
  //   "取得" を返す
  // もし method が "POST" と等しいなら
  //   "作成" を返す
  // "削除" を返す
}
```

**ヒント 2 コードへの直し方**

問8 と同じ形です。リテラル型の文字は、大文字と小文字も区別します。`"get"` と書くと、`"GET"` とは別の値になります。

### 問 19 在席ステータスから色を返す

**テストで確かめる値**

- `statusColor("online")` は `"green"`
- `statusColor("busy")` は `"red"`
- `statusColor("offline")` は `"gray"`

**ヒント 1 日本語の手順**

```ts
// 関数 statusColor を作る。"online" か "busy" か "offline" の status を受け取り、"green" か "red" か "gray" を返す
export function statusColor() {
  // もし status が "online" と等しいなら
  //   "green" を返す
  // もし status が "busy" と等しいなら
  //   "red" を返す
  // "gray" を返す
}
```

**ヒント 2 コードへの直し方**

問8・問18 と同じ形です。引数は `"online" | "busy" | "offline"`、戻り値は `"green" | "red" | "gray"` です。

### 問 20 順位が 1 なら "金"、2 なら "銀"、3 なら "銅"、それ以外は "なし" を返す

**テストで確かめる値**

- `medal(1)` は `"金"`
- `medal(2)` は `"銀"`
- `medal(3)` は `"銅"`
- `medal(4)` は `"なし"`

**ヒント 1 日本語の手順**

```ts
// 関数 medal を作る。数の rank を受け取り、"金" か "銀" か "銅" か "なし" を返す
export function medal() {
  // もし rank が 1 と等しいなら
  //   "金" を返す
  // もし rank が 2 と等しいなら
  //   "銀" を返す
  // もし rank が 3 と等しいなら
  //   "銅" を返す
  // "なし" を返す
}
```

**ヒント 2 コードへの直し方**

4 位より下の順位も来るので、引数は `1 | 2 | 3` にせず `number` にします。返す値は 4 つに決まっているので、戻り値は 4 つをつないだリテラル型です。

### 応用（総合） リテラル型

**テストで確かめる値**

- `move(5, "up")` は `6`
- `move(5, "down")` は `4`
- `move(5, "left")` は 型の確認でエラー。`"left"` は渡せないこと
- `START_POSITION` は `0`。型も `0` であること
- `move(START_POSITION, "up")` は `1`

**ヒント 1 日本語の手順**

```ts
// 関数 move を作る。数の position と、"up" か "down" の direction を受け取り、数を返す
export function move() {
  // もし direction が "up" と等しいなら
  //   position に 1 を足した数を返す
  // position から 1 を引いた数を返す
}

// 定数 START_POSITION を作り、0 を入れる（export を付け、型注釈は書かない）
```

**ヒント 2 コードへの直し方**

`move` の引数は、問13 と同じく数と 2 つのリテラル型です。中はこのまとめの `stockLevel` と同じ、`if` の中で返す形です。`START_POSITION` は q03 の問1 と同じ `export const` です。説明することは、`let` と `const` で 1 つずつ変数を作り、マウスを載せて型を見比べてから考えます。違いの理由は、「あとから入れ直せるか」から考えます。

