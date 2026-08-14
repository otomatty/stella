# レッスン9-2 演習 — モジュールとパッケージ

対象トピック: 9-2-1 〜 9-2-4

## ハンズオン

レッスン9-1で作ったフォルダで作業します。次の2つのファイルを作ってください。

```ts
// tax.ts
export const TAX_RATE = 0.1;

export const calcTax = (price: number): number => {
  return Math.round(price * TAX_RATE);
};

const secret = "これは外から見えない";
```

```ts
// main.ts
import { calcTax, TAX_RATE } from "./tax";

console.log(TAX_RATE); // => 0.1
console.log(calcTax(1000)); // => 100
```

```bash
npx tsc main.ts
```

```bash
node main.js
```

写経できたら、次の改造をしてみましょう。

1. `main.ts`に`import { secret } from "./tax";`を追加して、エラーメッセージを読みましょう
2. `import { calcTax } from "tax";`(`./`なし)に変えて、どんなエラーになるか確認しましょう
3. `export`を`export default`に変えて、`import`側をどう直せばよいか考えましょう

## 演習問題

### 問1(基本)

商品名と価格を受け取り、「コーヒー: 480円」の形の文字列を返す関数`formatProduct`を`product.ts`に作り、`export`してください。`main.ts`から`import`して表示してください。

### 問2(基本)

`product.ts`に、`export`していない定数を1つ書いてください。`main.ts`から取り込もうとするとどうなるか確認し、理由を説明してください。

### 問3(応用)

`npm install date-fns`でパッケージを導入し、今日の日付を「2026/08/09」の形で表示してください。あわせて`package.json`を開き、`date-fns`と`typescript`がそれぞれどこに書かれているか、なぜ違うのかを説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
// product.ts
export const formatProduct = (name: string, price: number): string => {
  return `${name}: ${price}円`;
};
```

```ts
// main.ts
import { formatProduct } from "./product";

console.log(formatProduct("コーヒー", 480));
// => "コーヒー: 480円"
```

`export`は宣言の前に付けるだけです。`import`の`from`には、拡張子なしの相対パスを書きます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
// product.ts
const INTERNAL_CODE = "P-XXX"; // exportしていない
```

```ts
// main.ts
import { INTERNAL_CODE } from "./product";
// エラー: Module '"./product"' has no exported member 'INTERNAL_CODE'.
```

`export`を書いていないものは、ファイルの外からは存在しないのと同じです。「エクスポートされたメンバーがありません」というメッセージがそのまま理由を表しています。

レッスン2-1のスコープ、7-2-1の`private`と同じ考え方です。**既定は非公開で、公開したいものだけ明示する**のが安全です。

</details>

<details>
<summary>問3の解答例</summary>

```bash
npm install date-fns
```

```ts
import { format } from "date-fns";

console.log(format(new Date(), "yyyy/MM/dd"));
// => "2026/08/09"
```

`package.json`では次のように分かれています。

```json
{
  "dependencies": {
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

`date-fns`は**実行時にも使う**ので`dependencies`です。日付の整形は、変換後のJavaScriptが動くときに必要になります。

`typescript`は**変換するときだけ使う**ので`devDependencies`です。変換が終われば、本番環境では不要になります。

この区別は、本番環境に配置するファイルの量にも影響します。

</details>

## 確認クイズ

### Q1. `export`を書いていない変数は、他のファイルから使えますか?

- A. 使える
- B. 使えない

<details>
<summary>答え</summary>

**B** — 既定は非公開です。公開したいものだけ`export`を付けます。

</details>

### Q2. `import { calcTax } from "./tax";` の`./`を消すとどうなりますか?

- A. 同じように動く
- B. パッケージ名として解釈され、見つからずエラーになる

<details>
<summary>答え</summary>

**B** — `./`があれば自分のファイル、なければパッケージ名です。パスの形で見分けられます。

</details>

### Q3. 本研修で基本とするのはどちらですか?

- A. 名前付きエクスポート
- B. デフォルトエクスポート

<details>
<summary>答え</summary>

**A** — 名前が固定されるので検索で追え、タイポも実行前に弾かれます。

</details>

### Q4. `node_modules`を消してしまったらどうしますか?

- A. プロジェクトを作り直す
- B. `npm install`で復元する

<details>
<summary>答え</summary>

**B** — `package.json`に何を入れたかが記録されているので、いつでも復元できます。使い捨ててよいフォルダです。

</details>
