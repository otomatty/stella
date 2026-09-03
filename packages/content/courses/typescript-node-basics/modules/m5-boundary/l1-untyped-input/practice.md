# レッスン5-1 演習 — 外から来る値を扱う

対象トピック: 5-1-1 〜 5-1-5

## 手元で試す

レッスン1-1で作った環境を使います。まず、型検査を通ったのに実行時に落ちる例を見ます。

```bash
cd ~/ts-node-practice
echo '{}' > user.json

cat > src/parse.ts <<'TS'
import { readFile } from "node:fs/promises";

type User = { id: number; name: string };

const text = await readFile("user.json", "utf-8");
const user = JSON.parse(text) as User;

console.log(user.name.length);
TS

npx tsc --noEmit     # 通る
npx tsc && node dist/parse.js    # 実行時に落ちる
```

`unknown` で受けると、確認するまで使えなくなることを確かめます。

```bash
cat > src/safe.ts <<'TS'
import { readFile } from "node:fs/promises";

const text = await readFile("user.json", "utf-8");
const value: unknown = JSON.parse(text);

console.log(value.name);
TS

npx tsc --noEmit     # エラー: 'value' is of type 'unknown'
rm src/safe.ts       # 確かめたら片付ける(残すと以降の検査が失敗し続ける)
```

`catch` の型も確かめます。

```bash
cat > src/err.ts <<'TS'
import { readFile } from "node:fs/promises";

try {
  await readFile("nofile.txt", "utf-8");
} catch (error) {
  console.error(error.message);
}
TS

npx tsc --noEmit     # エラー: 'error' is of type 'unknown'
```

次の書き換えでこのファイルは直るので、ここでは消さずに進めます。

`instanceof` で確認を足すと通ります。

```bash
cat > src/err.ts <<'TS'
import { readFile } from "node:fs/promises";

try {
  await readFile("nofile.txt", "utf-8");
} catch (error) {
  if (error instanceof Error) {
    console.error("読めません: " + error.message);
  } else {
    console.error("読めません(詳細不明)");
  }
}
TS

npx tsc --noEmit && npx tsc && node dist/err.js
```

最後に、境界の関数を書きます。

```bash
cat > src/env.ts <<'TS'
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error("環境変数 " + name + " が未設定です");
  }
  return value;
}

const apiUrl: string = requireEnv("API_URL");
console.log("接続先: " + apiUrl);
TS

npx tsc && node dist/env.js                       # 未設定なのでエラーが出る
API_URL=https://example.com node dist/env.js      # 通る
```

## 演習問題

### 問1(基本)

`JSON.parse(text) as User` と書いても安全でない理由を説明してください。

### 問2(基本)

`any` と `unknown` の違いを1文で説明してください。

### 問3(応用)

`catch (error)` の中で `error.message` がエラーになる理由と、対処を書いてください。

### 問4(応用)

`requireEnv` の戻り値の型が `string | undefined` ではなく `string` でよい理由を説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`as` は「その型だと思って扱う」という宣言であり、実行時の中身を検査しないためです。

型検査は実行前に行われ、ファイルや通信のデータが来るのは実行時です。中身が空でも型検査は通ってしまいます。

</details>

<details>
<summary>問2の解答例</summary>

どちらも何でも入りますが、`any` は使うときに検査されないのに対し、`unknown` は確認を通すまで使えません。

外から来た値には `unknown` を使い、確認漏れを型検査で止めます。

</details>

<details>
<summary>問3の解答例</summary>

- 理由: JavaScriptでは Error 以外の値も投げられるため、`catch` の引数の型は `unknown` になっているからです。
- 対処: `if (error instanceof Error)` で確認すると、その中では `Error` として `message` を読めます。

</details>

<details>
<summary>問4の解答例</summary>

値が無いときは例外を投げて処理を止めるため、返ってきた時点では必ず値があるからです。

境界の中で確認を済ませているので、呼び出し側は確認せずに `string` として扱えます。

</details>

## 確認クイズ

### Q1. `JSON.parse(text) as User` の `as` の説明として正しいものはどれですか。

- A. 実行時に中身を検査して、違えばエラーにする
- B. 「その型だと思って扱う」という宣言で、検査はしない
- C. 値を User 型に変換する

<details>
<summary>答え</summary>

**B** — 検査も変換もしません。外から来た値への安易な `as` は危険です。

</details>

### Q2. `any` と `unknown` の違いはどれですか。

- A. `unknown` は確認を通すまで値を使えない
- B. `any` には値を入れられない
- C. `unknown` は数値しか入らない

<details>
<summary>答え</summary>

**A** — 入口はどちらも何でも入りますが、出口の厳しさが違います。

</details>

### Q3. `catch (error)` の `error` の型はどれですか。

- A. `Error`
- B. `unknown`
- C. `string`

<details>
<summary>答え</summary>

**B** — Error 以外も投げられるため `unknown` です。`instanceof Error` で確認してから使います。

</details>

### Q4. 「境界」に当たるものはどれですか。

- A. 環境変数やファイル、通信など、外の世界と接する場所
- B. 関数と関数の間
- C. モジュールとモジュールの間

<details>
<summary>答え</summary>

**A** — 外から値が入ってくる場所が境界です。ここで1度だけ確認します。

</details>

### Q5. 境界で確認する設計の利点として、最も適切なものはどれですか。

- A. 内側の関数は型を信じて書けるので、確認だらけにならない
- B. 実行速度が上がる
- C. 型注釈を書かなくてよくなる

<details>
<summary>答え</summary>

**A** — 外は疑い、内は信じる。確認が1か所に集まるので、処理そのものに集中できます。

</details>
