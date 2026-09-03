# レッスン4-1 演習 — オブジェクトの型

対象トピック: 4-1-1 〜 4-1-4

## 手元で試す

レッスン1-1で作った環境を使います。

```bash
cd ~/ts-node-practice
cat > src/user.ts <<'TS'
type User = {
  id: number;
  name: string;
  phone?: string;
};

const users: User[] = [
  { id: 1, name: "佐藤" },
  { id: 2, name: "田中", phone: "03-0000-0000" },
];

for (const user of users) {
  if (user.phone === undefined) {
    console.log(user.name + ": 電話番号なし");
  } else {
    console.log(user.name + ": " + user.phone);
  }
}
TS

npx tsc --noEmit && npx tsc && node dist/user.js
```

型が守ってくれることを確かめます。次を追記して検査してください。

```bash
cat >> src/user.ts <<'TS'

const ng: User = { id: 3 };          // name が無い
users.push({ id: 4, name: 100 });    // name が数値
TS

npx tsc --noEmit       # 2件ともエラーになる
```

**確かめたら元に戻します**(`tsc` は `src/` の全ファイルを検査するので、壊れたファイルを残すと以降の検査が失敗し続けます)。

```bash
cat > src/user.ts <<'TS'
type User = {
  id: number;
  name: string;
  phone?: string;
};

const users: User[] = [
  { id: 1, name: "佐藤" },
  { id: 2, name: "田中", phone: "03-0000-0000" },
];

for (const user of users) {
  if (user.phone === undefined) {
    console.log(user.name + ": 電話番号なし");
  } else {
    console.log(user.name + ": " + user.phone);
  }
}
TS

npx tsc --noEmit       # エラーが消える
```

次に `readonly` を試します。

```bash
cat > src/order.ts <<'TS'
type Order = {
  readonly id: number;
  status: string;
};

const order: Order = { id: 1, status: "受付" };
order.status = "発送";
order.id = 2;
TS

npx tsc --noEmit       # 最後の行だけエラーになる
rm src/order.ts        # 確かめたら片付ける
```

## 演習問題

### 問1(基本)

商品を表す型 `Product` を定義してください。項目は、商品ID(数値)、商品名(文字列)、在庫数(数値)です。

### 問2(基本)

`Product` に「説明文(文字列、無くてもよい)」を追加してください。

### 問3(応用)

`Product` の一覧を受け取り、在庫が0の商品名だけを配列で返す関数のシグネチャ(引数と戻り値の型)を書いてください。中身の実装は書かなくて構いません。

### 問4(応用)

注文を表す型で、注文ID を `readonly` にする理由を説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
type Product = {
  id: number;
  name: string;
  stock: number;
};
```

型に名前を付けると、複数の関数で使い回せます。項目が増えたときに直すのもこの1か所です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
type Product = {
  id: number;
  name: string;
  stock: number;
  description?: string;
};
```

`?` を付けると省略できます。使うときは `undefined` の確認が必要になります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
function outOfStockNames(products: Product[]): string[] {
  // ...
}
```

引数はオブジェクトの配列 `Product[]`、戻り値は文字列の配列 `string[]` です。配列の型は「中身の型 + `[]`」で作ります。

</details>

<details>
<summary>問4の解答例</summary>

注文IDは作られた後に変わってはいけない値だからです。

`readonly` を付けると、うっかり書き換えるコードが型検査で止まります。コメントで注意書きを残すより確実です。

</details>

## 確認クイズ

### Q1. オブジェクトの形に名前を付ける書き方はどれですか。

- A. `type User = { id: number; name: string };`
- B. `const User = { id: number; name: string };`
- C. `function User(id: number, name: string) {}`

<details>
<summary>答え</summary>

**A** — `type 名前 = ...` が型エイリアスです。値の宣言ではありません。

</details>

### Q2. `phone?: string` の意味はどれですか。

- A. 電話番号は必ず文字列で入っている
- B. そのプロパティは無くてもよい(あれば文字列)
- C. 電話番号は書き換えられない

<details>
<summary>答え</summary>

**B** — 省略可能なプロパティです。使うときは値が無い場合の確認が必要になります。

</details>

### Q3. `User` 型のオブジェクトが複数並んだデータの型はどれですか。

- A. `User[]`
- B. `[User]`
- C. `Array(User)`

<details>
<summary>答え</summary>

**A** — 配列の型は「中身の型 + `[]`」です。`string[]` と同じ規則です。

</details>

### Q4. `readonly id: number` を付けたプロパティについて正しいものはどれですか。

- A. 読み取ることもできない
- B. 作った後に書き換えようとすると型検査でエラーになる
- C. 実行時に自動で元の値に戻る

<details>
<summary>答え</summary>

**B** — 読むことはできます。書き換えを型検査で止めるのが `readonly` です。

</details>

### Q5. オブジェクトの形に名前を付ける利点として、最も適切なものはどれですか。

- A. 実行速度が上がる
- B. 定義が1か所にまとまり、チームの会話でも使える言葉になる
- C. プロパティを自動で追加してくれる

<details>
<summary>答え</summary>

**B** — 項目が増えたときに直すのは定義の1か所だけで済み、「User を返す関数」のように会話でも使えます。

</details>
