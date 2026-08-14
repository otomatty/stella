# レッスン6-2 keyofとtypeof

## このレッスンの目標

- [ ] 型の位置の`typeof`で値から型を作れる
- [ ] `keyof`でプロパティ名の型を作れる
- [ ] インデックスアクセス型で戻り値の型を正確にできる

## 6-2-1 typeof型演算子

> **型の位置で使う`typeof`は、変数から型を取り出す**

設定オブジェクトと、その型を別々に書くと二重管理になります。項目を足したとき、片方だけ直して食い違います。

**レッスン1-6の`typeof`(値を調べる)とは別物です。** 見分け方は、書いてある場所が型の位置かどうかです。

| | 働くタイミング | 結果 |
| --- | --- | --- |
| 値の位置の`typeof` | 実行時 | 型名の文字列 |
| **型の位置の`typeof`** | コンパイル時 | **型** |

```ts
const config = {
  env: "production",
  port: 3000,
};

type Config = typeof config;
// { env: string; port: number }
```

`config`に項目を足すと、`Config`にも自動で反映されます。**値が正、型は派生**という向きが大事です。

![値から型を導く関係を示す図](t1-typeof-type/assets/typeof-derivation.svg)

レッスン5-6で学んだ`as const`と組み合わせると、リテラル型のまま取り出せるので、より狭い型が得られます。

## 6-2-2 keyof型演算子

> **`keyof`は、型のプロパティ名をリテラルのユニオン型にする**

「このオブジェクトのプロパティ名だけを受け取る」関数を書きたい場面があります。`string`で受けると、タイポしても実行するまで気づけません。

```ts
type Config = {
  env: string;
  port: number;
};

type ConfigKey = keyof Config;
// "env" | "port"
```

`key`は「キー = プロパティ名」の意味です。出てくるのはレッスン1-5で学んだ**リテラルのユニオン型そのもの**で、新しい種類の型は出てきません。

![型のプロパティ名がユニオン型になる図](t2-keyof/assets/keyof-union.svg)

`Config`にプロパティを足せば`ConfigKey`にも増えます。手で書き写す必要がありません。

## 6-2-3 keyof typeof

> **`keyof typeof` で、値から直接プロパティ名の型を作れる**

`keyof`は型に使いますが、手元にあるのは値(設定オブジェクト)であることが多くあります。型を別途宣言するのは、6-2-1で嫌った二重管理そのものです。

`keyof`の入力は型、`typeof`の出力は型。つながる形をしているので、素直につなぎます。

```ts
const config = {
  env: "production",
  port: 3000,
} as const;

type ConfigKey = keyof typeof config;
// "env" | "port"
```

読む順序は**右から左**です。`typeof`が先に働き、その結果に`keyof`が働きます。2段階に分けて読めば難しくありません。

![値 → 型 → キーの3段パイプラインの図](t3-keyof-typeof/assets/keyof-typeof-pipeline.svg)

宣言は`config`の1か所だけです。**上流の値を直せば、下流がすべて追従します。**

## 6-2-4 インデックスアクセス型と安全な読み取り

> **`型[キー]`でプロパティの型を取り出すと、戻り値の型まで正確になる**

設定を名前で読み取る関数を書きたい場面です。キーは`keyof`で縛れますが、戻り値の型が値ごとに違います(`env`なら`string`、`port`なら`number`)。戻り値を`string | number`にすると、使う側で毎回絞り込みが必要になって不便です。

```ts
const config = { env: "production", port: 3000 };
type Config = typeof config;

const get = <K extends keyof Config>(key: K): Config[K] => {
  return config[key];
};
```

`型[キー]`という書き方を**インデックスアクセス型**と呼びます。レッスン3-1の配列アクセスと同じ角かっこですが、こちらは型の位置に書きます。

`K`はキーの型引数で、`keyof Config`に制約されています。戻り値の`Config[K]`が「そのキーに対応する型」です。6-1-4の制約と6-2-2の`keyof`がここで合流します。

```ts
const env = get("env"); // 型は string
const port = get("port"); // 型は number

get("envv");
// エラー: Argument of type '"envv"' is not assignable
// to parameter of type '"env" | "port"'.
```

**キーごとに戻り値の型が変わっている**点が肝です。タイポは候補が並んだメッセージで弾かれます。

## もっと知りたい人へ

- [typeof型演算子](https://typescriptbook.jp/reference/type-reuse/typeof-type-operator) — 型の位置のtypeof
- [keyof型演算子](https://typescriptbook.jp/reference/type-reuse/keyof-type-operator) — keyofの詳しい説明
- [インデックスアクセス型](https://typescriptbook.jp/reference/type-reuse/indexed-access-types) — `型[キー]`の詳しい説明

---

演習は [practice.md](practice.md) にあります。
