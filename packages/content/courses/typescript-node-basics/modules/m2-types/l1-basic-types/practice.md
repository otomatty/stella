# レッスン2-1 演習 — 基本の型

対象トピック: 2-1-1 〜 2-1-4

## 手元で試す

レッスン1-1で作った環境を使います。

```bash
cd ~/ts-node-practice
cat > src/types.ts <<'TS'
const name: string = "佐藤";
const price: number = 1200;
const isActive: boolean = true;

console.log(name, price, isActive);
TS

npx tsc --noEmit
```

わざと型を間違えて、メッセージを読みます。

```bash
cat > src/wrong.ts <<'TS'
const price: number = "1200";
TS

npx tsc --noEmit      # Type 'string' is not assignable to type 'number'
rm src/wrong.ts
```

環境変数の型を確かめます。

```bash
cat > src/env.ts <<'TS'
const port = process.env.PORT;
console.log(port.length);
TS

npx tsc --noEmit      # 'port' is possibly 'undefined'
```

確認を足すと通ることを見ます。

```bash
cat > src/env.ts <<'TS'
const port = process.env.PORT;
if (port !== undefined) {
  console.log(port.length);
}
TS

npx tsc --noEmit      # エラーが消える
```

配列も試してください。

```bash
cat > src/list.ts <<'TS'
const names: string[] = ["佐藤", "田中"];
names.push("鈴木");
names.push(100);
TS

npx tsc --noEmit      # 最後の行だけエラーになる
rm src/list.ts src/env.ts src/types.ts
```

## 演習問題

### 問1(基本)

次の3つの値に型注釈を付けて宣言してください。商品名(文字列)、在庫数(数値)、公開中かどうか(真偽値)。

### 問2(基本)

`const name = "佐藤";` に型注釈を書かなくてよい理由を説明してください。

### 問3(応用)

`process.env.API_URL` をそのまま使おうとするとエラーになります。理由と、使えるようにする書き方を説明してください。

### 問4(応用)

型注釈を「書かない場所」と「必ず書く場所」を、それぞれ1つずつ挙げて理由を書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const productName: string = "ノート";
const stock: number = 12;
const isPublished: boolean = true;
```

書き方は `名前: 型 = 値` です。実務では初期値があるので、型注釈を省いて推論に任せることも多くあります。

</details>

<details>
<summary>問2の解答例</summary>

初期値 `"佐藤"` から `string` だと分かるためです(型推論)。

推論に任せても検査の強さは変わりません。後から数値を入れようとすればエラーになります。

</details>

<details>
<summary>問3の解答例</summary>

- 理由: 環境変数は渡されないこともあるため、型が `string | undefined` になっており、値が無い可能性があるまま使えないからです。
- 書き方: `if (apiUrl !== undefined) { ... }` のように確認を通すと、その中では `string` として扱えます。

</details>

<details>
<summary>問4の解答例</summary>

- 書かない場所: 初期値のある変数。値から型が分かるので、二重に書くと読みにくくなります。
- 必ず書く場所: 関数の引数。呼び出し側から何が渡ってくるかは、コードを見ただけでは分からないためです。

</details>

## 確認クイズ

### Q1. 整数と小数を表すTypeScriptの型はどれですか。

- A. 整数は `int`、小数は `float`
- B. どちらも `number`
- C. どちらも `string`

<details>
<summary>答え</summary>

**B** — TypeScriptでは整数も小数も `number` です。

</details>

### Q2. `const price = 1200;` に型注釈を書かなくてよい理由はどれですか。

- A. 型推論により、初期値から `number` だと判断されるから
- B. `const` には型を書けないから
- C. 数値には型検査が働かないから

<details>
<summary>答え</summary>

**A** — 推論に任せても検査の強さは変わりません。

</details>

### Q3. `string | undefined` が表す意味はどれですか。

- A. 文字列と undefined の両方を同時に持つ
- B. 文字列か、値が無いかのどちらか
- C. 文字列を undefined に変換する

<details>
<summary>答え</summary>

**B** — `|` は「AかB」を表すユニオン型です。使う前に確認が必要になります。

</details>

### Q4. 型注釈を必ず書くべき場所はどれですか。

- A. 初期値のある変数
- B. 関数の引数
- C. 配列の要素すべて

<details>
<summary>答え</summary>

**B** — 引数は呼び出し側との約束の場所なので、推論に任せず必ず書きます。

</details>

### Q5. 文字列だけが入る配列の型はどれですか。

- A. `string[]`
- B. `array<string>`
- C. `[string]`

<details>
<summary>答え</summary>

**A** — 中身の型の後ろに `[]` を付けます。数値の配列なら `number[]` です。

</details>
