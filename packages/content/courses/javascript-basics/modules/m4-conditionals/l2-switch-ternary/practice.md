# レッスン4-2 演習 — switchと三項演算子

対象トピック: 4-2-1 〜 4-2-3

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `status.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const status = "done";
    switch (status) {
      case "draft":
        console.log("下書き");
        break;
      case "done":
        console.log("完了");
        break;
      default:
        console.log("不明");
    }
    const stock = 5;
    console.log(stock > 0 ? "在庫あり" : "在庫なし");
  </script>
</body>
```

2. `完了` と `在庫あり` が出ることを確かめる

書けたら、次の改造を試してみましょう。

1. `status` を `"draft"`、`"pending"` に変えて、caseとdefaultの道を通す
2. `case "done":` の `break` を消して保存し、`不明` まで続けて出てしまうこと(下に落ちる)を確かめる。確かめたら戻す
3. `stock` を `0` に変えて、三項演算子の結果が変わることを確かめる

## 演習問題

### 問1(基本)

曜日コード(`"mon"` / `"sat"` / `"sun"`)を受け取り、`平日` / `土曜` / `日曜` と表示するswitchを書いてください。`"mon"` 以外の平日コードは考えなくて構いません。どれでもなければ `不明` とします。

### 問2(基本)

次のif/elseを三項演算子で1行に書き換えてください。

```js
let message;
if (count === 0) {
  message = "未処理";
} else {
  message = "処理済み";
}
```

### 問3(応用)

次の場面で、if / switch / 三項演算子のどれを選ぶか答え、理由を一言で書いてください。

1. 会員ランク(数値の範囲で3段階)を判定して表示する
2. APIのエラーコード(5種類の文字列)ごとにメッセージを変える
3. ボタンのラベルを、編集中かどうかで「保存」「編集」から選ぶ

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
const day = "sat";
switch (day) {
  case "mon":
    console.log("平日");
    break;
  case "sat":
    console.log("土曜");
    break;
  case "sun":
    console.log("日曜");
    break;
  default:
    console.log("不明");
}
```

</details>

<details>
<summary>問2の解答例</summary>

```js
const message = count === 0 ? "未処理" : "処理済み";
```

2択の値選びなので三項演算子が意図に合います。letもconstにできます。

</details>

<details>
<summary>問3の解答例</summary>

1. if — 範囲の比較(>=)はcaseに書けないため
2. switch — 1つの値と定数の一致比較が5つ並ぶため
3. 三項演算子 — 2択の値を選ぶだけのため

</details>

## 確認クイズ

### Q1. switchのdefaultの役割はどれですか。

- A. 最初に必ず実行される
- B. どのcaseにも一致しなかったときに実行される
- C. switchを終了する

<details>
<summary>答え</summary>

**B** — ifのelseに相当します。switchを抜けるのはbreakです。

</details>

### Q2. caseのbreakを書き忘れるとどうなりますか。

- A. 構文エラーになる
- B. そのcaseだけ実行されない
- C. 次のcaseの処理まで続けて実行される

<details>
<summary>答え</summary>

**C** — エラーにならず下に落ちるため、気づきにくい落とし穴です。

</details>

### Q3. stock > 0 ? "あり" : "なし" で、stockが0のときの値はどれですか。

- A. "あり"
- B. "なし"
- C. true

<details>
<summary>答え</summary>

**B** — 0 > 0 はfalseなので、:の後ろの値になります。

</details>

### Q4. 三項演算子が向いている場面はどれですか。

- A. 複数行の処理を分けたいとき
- B. 2択の値を選んで代入したいとき
- C. 5種類の値との一致で分岐したいとき

<details>
<summary>答え</summary>

**B** — 三項演算子は値を選ぶ式です。複数行の処理はif、一致の列挙はswitchが向きます。

</details>
