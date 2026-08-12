# レッスン9-3 tsconfig

## このレッスンの目標

- [ ] `tsconfig.json`の役割を説明できる
- [ ] `target`と`outDir`を設定できる
- [ ] `strict`が何を有効にしているか説明できる

## 9-3-1 tsconfig.jsonとは

> **`tsconfig.json`は、コンパイラーへの指示をまとめた設定ファイル**

9-1-3では`npx tsc index.ts`とファイル名を毎回指定していました。ファイルが100個になったら指定しきれません。設定をファイルにまとめておけば、コマンドは`tsc`だけで済みます。

プロジェクトの根元に置きます。`npx tsc --init`で雛形を作れます。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "outDir": "./dist",
    "strict": true
  }
}
```

9-2-4の`package.json`がプロジェクトの設計図なら、こちらは**コンパイラー専用の設定**です。役割が違うので両方置きます。

![tsconfig.jsonの構造を示す図](t1-tsconfig/assets/tsconfig-structure.svg)

`compilerOptions`が本体で、その中に個別の設定が並びます。`tsc --init`はコメント付きで数十行出ますが、**有効なのは数個だけ**です。現場のtsconfigは長くても、読むべき項目は限られます。

## 9-3-2 targetとoutDir

> **`target`は変換後のJavaScriptの世代、`outDir`は出力先を決める**

9-1-3では`.ts`の隣に`.js`ができて、ファイルが混ざっていました。ソースと生成物が同じ場所にあると、どちらを編集すればよいか分からなくなります。

- **`target: "ES2022"`** — 2022年版の書き方で出力する
- **`outDir: "./dist"`** — 変換後のファイルを`dist`に集める

JavaScriptは毎年仕様が更新されています。`target`を古くすると、新しい書き方が古い書き方に置き換えられて出力されます。

```ts
// 書いたコード
const greet = (name: string): string => `${name}さん`;
```

```js
// target: "ES5" だと
var greet = function (name) { return name + "さん"; };
```

アロー関数もテンプレートリテラルもES5には存在しないので置き換えられます。レッスン1-1で「`var`は書かない」と学びましたが、**出力には現れることがあります。** 「読めればよい」というあのときの話につながります。

迷ったときの目安は次のとおりです。

- `target` — 動かす環境が対応している中で、新しいものを選ぶ
- `outDir` — 必ず設定してソースと分ける(`dist`が慣習)

`module`という項目もありますが、これは9-2-1の`import`/`export`をどう出力するかの設定です。使うフレームワークが決めることが多いので、雛形のままで構いません。**全部を理解しようとしなくて大丈夫です。**

## 9-3-3 strict

> **`strict`はチェックを厳しくする設定の詰め合わせ。必ず`true`にする**

`strict: false`だと、TypeScriptの守りが大幅に緩みます。緩いことに気づかないまま書くと、型があるのにバグが素通りします。

8つほどの個別設定を一括で有効にするもので、**Playgroundでは既定で有効**です。だから研修中は意識せずに済んでいました。研修で見てきたエラーの多くは、`strict`がONだからこそ出ていたものです。

![strictに含まれる設定を示す図](t3-strict/assets/strict-bundle.svg)

個別に有効化もできますが、**まとめて`true`にするのが実務の標準**です。個別の名前を全部覚える必要はありません。

既存プロジェクトで`false`になっている場合、いきなり`true`にすると大量のエラーが出て手が止まります。その場合は`noImplicitAny`から、というように段階的に有効化していきます。新規プロジェクトなら最初から`true`一択です。

## 9-3-4 noImplicitAnyとstrictNullChecks

> **`noImplicitAny`は型の書き忘れを、`strictNullChecks`は空チェック漏れを止める**

チームのtsconfigを読むとき、この2つの名前は必ず出てきます。研修中に何度も出会ったエラーの正体でもあります。

**noImplicitAny — 型の書き忘れ**

```ts
const calcTax = (price) => price * 0.1;
// エラー: Parameter 'price' implicitly has an 'any' type.
```

レッスン4-1で見たエラーです。`implicitly`は「暗黙のうちに」の意味で、書かなければ`any`になるところを許しません。5-3-1で学んだとおり、`any`はすべてのチェックを止めてしまいます。

**strictNullChecks — 空チェック漏れ**

```ts
const phone: string | undefined = undefined;
console.log(phone.length);
// エラー: 'phone' is possibly 'undefined'.
```

レッスン1-6で見たエラーです。使う前に確かめることを強制します。

![strictNullChecksのONとOFFで挙動が変わることを示す図](t4-strict-options/assets/strictnullchecks-flow.svg)

この設定がOFFだと、`undefined`がどの型にも代入できてしまい、**ユニオン型で「空になりうる」を表現する意味そのものが失われます。** 2-3-2の絞り込みも要らなくなる代わりに、実行時エラーが増えます。

JavaScriptで最も有名な実行時エラー「Cannot read properties of undefined」を、この1設定で大幅に減らせます。

## もっと知りたい人へ

- [tsconfig.json](https://typescriptbook.jp/reference/tsconfig) — 設定項目の詳しい説明
- [strict](https://typescriptbook.jp/reference/tsconfig/strict) — strictに含まれる設定の一覧

---

演習は [practice.md](practice.md) にあります。
