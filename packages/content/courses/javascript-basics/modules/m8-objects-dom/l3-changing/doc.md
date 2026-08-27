# レッスン8-3 画面を変える

## このレッスンの目標

- [ ] textContentとclassListで画面の文字と見た目を変えられる
- [ ] createElement + appendChildで要素を増やし、removeで消せる
- [ ] 入力欄のvalueを読み、追加後に空へ戻せる

## 8-3-1 textContentで文字を変える

> **要素.textContentに代入すると、表示される文字が変わる**

ここまでの結果表示はずっとコンソールでしたが、利用者はコンソールを開きません。画面そのものに出すには、要素が持つ「中の文字」のプロパティ **textContent** を書き換えます。

```html
<p class="message">未保存です</p>
<script>
  const message = document.querySelector(".message");
  message.textContent = "保存しました";
</script>
```

オブジェクトのプロパティ読み書き(レッスン8-1)がそのまま要素にも通じます。読むことも代入で書き換えることもできます。

```js
console.log(message.textContent);  // => "保存しました"
```

似た道具に `innerHTML` がありますが、**文字を入れるならtextContentを使ってください**。innerHTMLは中身をHTMLとして解釈するため、利用者の入力をそのまま入れると、悪意あるコードの混入(スクリプト注入)の入り口になります。

## 8-3-2 classListで見た目を切り替える

> **classListのadd / remove / toggleで、要素のclassを付け外しできる**

「完了したタスクは打ち消し線にしたい」とき、線や色の指定をJavaScriptに直接書くのは分担違いです。見た目はCSSに書いておき、JavaScriptは **どの見た目か(class)の切り替えだけ** を担います。

```css
.done { text-decoration: line-through; }
```

```js
const item = document.querySelector("li");
item.classList.add("done");     // 打ち消し線が付く
item.classList.remove("done");  // 元に戻る
```

**classList** は要素のclass一覧を扱うプロパティで、`add`(付ける)、`remove`(外す)、**toggle**(あれば外す・なければ付ける)のメソッドを持ちます。

toggleはクリックと相性抜群です。

```js
item.addEventListener("click", () => {
  item.classList.toggle("done");
});
```

押すたびに完了⇔未完了が切り替わるUIが3行で書けます。「見た目はCSS、切り替えはJavaScript」 — 講座冒頭の3言語の分担が、ここで実装パターンとして完成します。

## 8-3-3 createElementとappendChildで要素を足す

> **createElementで作った要素は、appendChildで親に差し込むと画面に現れる**

「追加」ボタンでリストに項目を増やすには、HTMLに書いていない要素をあとから生やす必要があります。手順は2段階です。

```js
const list = document.querySelector("ul");
const item = document.createElement("li");
item.textContent = "新しいタスク";
list.appendChild(item);
```

1. **createElement**(タグ名) — 新しい要素を作ります。**作っただけではまだ画面に出ません**
2. 親要素.**appendChild**(要素) — 親の末尾に差し込みます。この瞬間にDOMツリーの一員になり、描画されます

「作る → 中身を入れる → 差し込む」の3拍子で覚えてください。2段階に分かれているおかげで、差し込む前に中身や見た目を整えられ、未完成の要素が画面にチラつきません。

## 8-3-4 removeで要素を消す

> **要素.remove()を呼ぶと、その要素はページから消える**

増やすの対になる操作です。要素自身の **remove** メソッドを呼ぶだけで、DOMツリーから外れて描画からも消えます。

```js
const notice = document.querySelector(".notice");
notice.remove();
```

名前の衝突に注意してください。`classList.remove("done")` はclassを外すだけ、`要素.remove()` は要素ごと消します。

レッスン7-2の委譲と組み合わせると、「押した項目を消す」が書けます。

```js
const list = document.querySelector("ul");
list.addEventListener("click", (event) => {
  if (event.target === list) {
    return;  // ulの余白のクリックは無視
  }
  event.target.remove();
});
```

リスナーは親に1つなので、あとからappendChildで増えた項目にもそのまま効きます。

先頭のガードを忘れないでください。event.targetには「実際にイベントが起きた要素」が入るので、liではなくulの余白をクリックすると **ul自身** が入ります。ガードが無いとその一撃でリストごと消えます。委譲では「消したい相手かどうか」を確かめてから消す、が型です。

## 8-3-5 入力欄の値はvalueで読む

> **入力欄のいまの中身は、要素.valueで文字列として取れる**

最後の部品は「受け取る」です。利用者がタイプした内容は、**入力欄**(input)の **value** プロパティから読めます(textContentでは取れません)。

```html
<form><input><button>追加</button></form>
<script>
  const input = document.querySelector("input");
  const form = document.querySelector("form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log(input.value);
  });
</script>
```

フォームで囲んでおくと、ボタンのクリックでも入力欄でのEnterでも同じsubmitイベントが起きます。preventDefault(レッスン7-2)で再読み込みを止めるのを忘れずに。

valueの型は常に文字列です。数として計算するならNumber()を通します(レッスン1-2の伏線がここで回収されます)。書き込みもできるので、追加処理の最後に空へ戻すのが定番の後片付けです。

```js
input.value = "";  // 空にして次の入力に備える
```

## もっと知りたい人へ

- 要素の属性を変える `setAttribute` や、`img.src` のようなプロパティ書き換えもあります。textContent / classList / valueと同じ「プロパティを読み書きする」感覚で使えます
- appendChildの仲間に、位置を選んで差し込む `prepend` や `before` / `after` もあります

---

演習は [practice.md](practice.md) にあります。
