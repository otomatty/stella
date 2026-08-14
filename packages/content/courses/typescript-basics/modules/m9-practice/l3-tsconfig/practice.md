# レッスン9-3 演習 — tsconfig

対象トピック: 9-3-1 〜 9-3-4

## ハンズオン

レッスン9-2で作ったフォルダで作業します。

```bash
npx tsc --init
```

生成された`tsconfig.json`を開き、コメントを消して次の内容にしてください。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "strict": true
  }
}
```

これでファイル名の指定が不要になります。

```bash
npx tsc
```

```bash
node dist/main.js
```

写経できたら、次の改造をしてみましょう。

1. `outDir`を消して再ビルドし、`.js`がどこに出るか確認しましょう
2. `target`を`"ES5"`に変えて、`dist/main.js`の中身がどう変わるか見ましょう
3. `strict`を`false`にして、後述の演習コードのエラーが消えることを確認しましょう

## 演習問題

### 問1(基本)

`target`を`"ES2022"`と`"ES5"`に切り替えて、次のコードの出力を見比べてください。何が変わりましたか。

```ts
const greet = (name: string): string => `${name}さん`;
console.log(greet("田中"));
```

### 問2(基本)

次のコードを`strict: true`と`strict: false`の両方で試し、それぞれどうなるか確認してください。

```ts
const calcTax = (price) => price * 0.1;
console.log(calcTax("1000"));
```

### 問3(応用)

次のコードは`strict: true`ではエラーになりますが、`false`では通ってしまいます。**通ったまま実行すると何が起きるか**を予想し、実際に確かめてください。

```ts
const phone: string | undefined = undefined;
console.log(phone.length);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`target: "ES2022"` のとき:

```js
const greet = (name) => `${name}さん`;
```

`target: "ES5"` のとき:

```js
var greet = function (name) { return name + "さん"; };
```

変わったのは3点です。

1. `const` → `var`
2. アロー関数 → `function`
3. テンプレートリテラル → `+`による文字列連結

いずれもES5には存在しない書き方なので、古い書き方に置き換えられています。レッスン1-1で「`var`は書かない」と学びましたが、**出力には現れることがある**わけです。

</details>

<details>
<summary>問2の解答例</summary>

`strict: true` のとき:

```
error TS7006: Parameter 'price' implicitly has an 'any' type.
```

`strict: false` のとき、エラーは出ず、実行すると次のようになります。

```
NaN
```

`"1000" * 0.1`は計算できないため`NaN`(Not a Number)になります。型を書き忘れたことで`price`が`any`になり、文字列を渡してもコンパイラーが止めてくれませんでした。

**エラーが消えたのではなく、見えなくなっただけ**です。実行してみるまで気づけません。

</details>

<details>
<summary>問3の解答例</summary>

`strict: false`で通したまま実行すると、実行時エラーになります。

```
TypeError: Cannot read properties of undefined (reading 'length')
```

JavaScriptで最も有名な実行時エラーです。`undefined`には`length`がないため、読もうとした瞬間にプログラムが止まります。

`strictNullChecks`(`strict`に含まれる)がONなら、実行する前に次のエラーで止めてくれます。

```
error TS18048: 'phone' is possibly 'undefined'.
```

レッスン0-1で見た「気づくのが遅いほど手間が増える」の実例です。設定1つで、気づくタイミングが本番から編集中へ前倒しされます。

</details>

## 確認クイズ

### Q1. `tsconfig.json`があると何が変わりますか?

- A. `npx tsc`だけで全ファイルが変換される
- B. コードが速くなる
- C. 型が不要になる

<details>
<summary>答え</summary>

**A** — ファイル名の指定や個別のオプション指定が不要になります。

</details>

### Q2. `outDir`は何を決めますか?

- A. 変換後のJavaScriptの世代
- B. 変換後のファイルの出力先
- C. 対象にするファイル

<details>
<summary>答え</summary>

**B** — 設定しないとソースの隣に出力され、ファイルが混ざります。`dist`が慣習です。

</details>

### Q3. `strict: true` にすべきなのはどんなプロジェクトですか?

- A. 新規プロジェクトのみ
- B. 基本すべて。既存で`false`なら段階的に有効化する

<details>
<summary>答え</summary>

**B** — いきなり`true`にすると大量のエラーが出るので、既存プロジェクトでは個別設定から進めます。

</details>

### Q4. `strictNullChecks`がOFFだと何が起きますか?

- A. `undefined`がどの型にも代入でき、実行時エラーが増える
- B. 型注釈が書けなくなる
- C. コンパイルできなくなる

<details>
<summary>答え</summary>

**A** — ユニオン型で「空になりうる」を表現する意味が失われます。

</details>
