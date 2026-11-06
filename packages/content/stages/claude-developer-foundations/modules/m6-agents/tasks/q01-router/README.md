# 入力で振り分ける

問い合わせの窓口に、ルーティングのワークフローを作ります。最初の呼び出しで問い合わせを分類し、種類ごとに決めたモデル・指示で答えさせます。`src/router.js` の 2 つの関数を直してください。いまの実装は、分類を使わず、どの問い合わせも同じ行き先で答えています。

## 作るもの

### `parseCategory(label, categories)`

分類の呼び出しが返した文字列 `label` を、決めた種類の名前(`categories`、小文字)にそろえます。

- 前後の空白と改行を除き、小文字にし、末尾の句読点(`.`・`。`・`、`・`,`・`!`・`?` とその全角)を外します。
- そろえた文字列が `categories` のどれかと完全に一致すれば、その名前を返します。一致しなければ `null` を返します。

```js
parseCategory("  Technical\n", ["billing", "technical", "general"]); // => "technical"
parseCategory("refund", ["billing", "technical", "general"]); // => null
```

### `routeInquiry(text, options)`

| 値 | 中身 |
| --- | --- |
| `classify` | 問い合わせの本文を受け取り、分類の文字列を返す関数(`async`)。本物では Claude の呼び出し |
| `send` | リクエストを送り、応答(`{ content }`)を返す関数(`async`) |
| `routes` | 種類の名前ごとの `{ model, system, maxTokens }` |
| `fallback` | 分類がどの種類にも当てはまらないときの行き先(`routes` の名前) |

- `fallback` が `routes` になければ、何も送らずに、その名前を含むメッセージの `Error` を投げます。
- `classify(text)` の結果を `parseCategory` で `routes` の名前にそろえます。`null` なら `fallback` の行き先にします。
- 行き先の `model`・`maxTokens`・`system` と、問い合わせを `user` の発言にした `messages` で、`send` を 1 回呼びます(`max_tokens` と `system` の項目名に注意)。
- `{ category: 行き先の名前, model, text: 応答のテキストのブロックをつないだ文字列, fellBack: fallback に回したか }` を返します。

## 説明欄に書くこと

提出の説明欄に、分類の結果をそろえる処理が必要な理由と、当てはまらない分類をどう扱ったかを、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません(テストは偽の `classify` と `send` を渡します)。テストと設定のファイルは書き換えません。

本物の `classify` を作るなら、構造化出力のスキーマで種類を `enum` に絞ると、形の崩れが減ります。それでも大文字と小文字は保証されないので、そろえる処理は残します(任意。費用がかかります)。
