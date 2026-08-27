# レッスン7-1 イベントを聞く

## このレッスンの目標

- [ ] querySelectorで要素を取り、addEventListenerでclickを聞ける
- [ ] イベントオブジェクトからevent.keyを読める
- [ ] onclick属性を使わない理由を説明できる

## 7-1-1 イベントは画面で起きる出来事

> **クリックやキー入力といった画面の出来事をイベントと呼ぶ**

講座の前半で書いたコードは、ページを読み込んだ瞬間に上から実行されて終わりでした。「ボタンを押したら動く」という本来の目標を扱うには、まず出来事に名前が要ります。

**イベント** とは、ブラウザーが検知する画面の出来事です。出来事ごとに名前が決まっています。

| イベント名 | 起きるとき |
| --- | --- |
| **click** | 要素がクリックされた |
| **keydown** | キーが押された |
| input | 入力欄の中身が変わった |

この講座で主に使うのはclickとkeydownです。他にもマウス移動、スクロール、読み込み完了など多数あります。

プログラムの形もここで変わります。前半のコードは「上から順に実行する手順書」でしたが、後半は「出来事が起きたら、この処理」という**予約表**を並べる形になります。読み込み後のページは、出来事が起きるのを待ち続けます。

## 7-1-2 querySelectorで相手の要素を取る

> **document.querySelector()で、ページの要素を1つ取ってこられる**

「ボタンが押されたら」を予約するには、そのボタンをJavaScript側から指す必要があります。ページとコードをつなぐ入り口が **document** です。

- **document** — 表示中のページそのものを表す値
- **querySelector**(セレクター) — 指定に合う要素を1つ返すメソッド。**セレクター** にはまずタグ名を書きます

```html
<button>保存</button>
<script>
  const button = document.querySelector("button");
  console.log(button);  // => <button>保存</button>
</script>
```

取れた要素は変数に入れて使い回すのが定石です。

ここでM0の伏線が回収されます。ブラウザーは上から読むので、scriptがbodyの末尾にあれば、実行時に上の要素はもう存在しています。scriptを先頭に置くと、querySelectorはまだ無い要素を探して `null`(「無い」を表す値)を返してしまいます。

## 7-1-3 addEventListenerで処理を登録する

> **addEventListenerで、イベントが起きたときに動く関数を登録できる**

部品はそろいました。要素(querySelector)、イベント名(click)、渡す関数(コールバック)。これらを結びつけるのが **addEventListener** です。

```html
<button>保存</button>
<script>
  const button = document.querySelector("button");
  button.addEventListener("click", () => {
    console.log("保存しました");
  });
</script>
```

`要素.addEventListener(イベント名, 関数)` の形で、処理を予約(**登録**)します。登録された関数を **イベントリスナー**(聞き耳を立てている関数)と呼びます。クリックするたびに関数が呼ばれ、ログが増えていきます。

定番のミスが2つあります。

```js
button.addEventListener(click, ...);     // 引用符忘れ → ReferenceError
button.addEventListener("click", f());   // 関数を実行して渡している
```

- イベント名は文字列です。`"click"` と引用符で囲みます
- 渡すのは関数そのものです。`()` を付けると「今すぐ実行した結果」を渡してしまいます(レッスン6-2のカッコ問題がここで実害になります)

## 7-1-4 イベントオブジェクトで詳しく知る

> **リスナーの引数には、押されたキーなどの詳細が入ったイベントオブジェクトが渡される**

keydownは「何かのキーが押された」ことしか分からないのでしょうか。実は、ブラウザーはリスナーを呼ぶときに、詳細情報の包みを引数で渡してきます。この包みを **イベントオブジェクト** と呼びます(慣習で `event` や `e` という仮引数で受けます)。

```html
<input>
<script>
  const input = document.querySelector("input");
  input.addEventListener("keydown", (event) => {
    console.log(event.key);
  });
</script>
```

**event.key** には、押されたキーの名前が文字列で入っています(`"a"`、`"Enter"`、`"ArrowUp"` など)。条件分岐と組み合わせれば「Enterだけ特別扱い」が書けます。

```js
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    console.log("送信します");
  }
});
```

## 7-1-5 onclick属性は使わない

> **HTMLのonclick属性ではなく、JavaScript側のaddEventListenerで登録する**

検索すると `<button onclick="save()">` というHTMLがたくさん出てきます。この **onclick属性** は、この講座では使いません。理由は3つあります。

1. **分担が崩れる** — 中身(HTML)と動き(JavaScript)が混ざり、修正箇所が散らばります。HTML/CSS入門で「見た目の指定をHTMLに混ぜない」と学んだのと同じ話です
2. **1つしか書けない** — onclick属性は1要素1イベントに1つだけ。addEventListenerは同じ要素に複数のリスナーを登録できます
3. **動かない現場がある** — セキュリティ設定(インラインのコード実行を禁止する設定)を入れている現場では、属性に書いた処理は実行されません

```html
<button onclick="save()">保存</button>       <!-- 使わない -->
```

登録はすべてJavaScript側の `addEventListener` に統一します。

## もっと知りたい人へ

- イベントの種類は数百あります。「JavaScript イベント 一覧」で検索すると、どんな出来事が拾えるのか眺められます
- `element.onclick = 関数` というプロパティへの代入形式もあります。onclick属性よりはましですが、複数登録できない制限は同じなので、addEventListenerに統一するのが現代の書き方です

---

演習は [practice.md](practice.md) にあります。
