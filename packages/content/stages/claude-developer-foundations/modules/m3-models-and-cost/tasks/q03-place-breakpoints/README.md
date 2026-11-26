# 変わる頻度に合わせてキャッシュを区切る

備品の貸出窓口には、共通の指示と、拠点ごとに異なる貸出資料があります。同じ拠点への質問が続く間にも、質問の文は毎回変わり、資料は 1 日に数回更新されます。レッスン 3-4 のあとで、区切りの置き方と、前回のリクエストと比べてどこから違ったかを調べる方法を実装します。編集するファイルは `src/layered-cache.js` です。

## 作るもの

### `buildLayeredRequest({ model, maxTokens, tools, instructions, policy, question })`

Messages API のリクエスト本文を組み立てます。`model` と `maxTokens` は、本文の `model` と `max_tokens` に入れます。

| 層         | 入れるもの                                                                                                   | 区切り                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `tools`    | 入力のツール定義を受け取った順で入れる。入力の配列は書き換えない                                             | この関数では付けない                                         |
| `system`   | `{ type: "text", text: … }` のブロックを、共通の指示と拠点の資料の順に並べる。資料が空文字なら指示だけにする | 各ブロックに `cache_control: { type: "ephemeral" }` を付ける |
| `messages` | 質問だけを `role: "user"` の発言 1 つにする。質問の文を `content` に入れる                                   | 付けない                                                     |

### `findCacheBreak(previous, next)`

前回と今回のリクエスト本文を渡すと、キャッシュに使う前半のうち最初に異なる場所を `{ layer, blockIndex }` で返します。

- モデルが違えば `{ layer: "model", blockIndex: null }` を返します。
- `tools` → `system` → `messages` の順で、今回の最後の明示的な `cache_control` 付きブロックまでを比べます。区切りのあるブロックも比較に含めます。ツール定義や発言の内容ブロックにも区切りを置いた入力を扱います。最後の区切りより後ろは比較の範囲外です。
- 違いがあれば `layer` に層の名前を入れます。`system` なら最初に違うブロックの位置を 0 から数えて `blockIndex` に入れます。ほかの層の `blockIndex` は `null` です。
- 比較する範囲に違いがない場合や、同じモデルで今回の明示的な区切りがない場合は `{ layer: null, blockIndex: null }` を返します。

たとえば、共通の指示が同じで、貸出資料だけを差し替えたら `{ layer: "system", blockIndex: 1 }` です。質問だけが変わった場合、上の関数で作った本文では両方とも `null` になります。この比較で分かるのは入力の差です。実際の読み込み量は API 応答の `usage` で確かめます。

## 説明欄に書くこと

- 質問のあとにだけ区切りを置く構成で、質問が毎回変わると、有効期間を延ばしても読み込みが増えない理由を書きます。
- 自分の区切りの置き方で、共通の指示・資料・質問を一つずつ変えたときに、どこまでを読み込み、どの部分を書き込むか、または通常入力として扱うかを説明します。区切りまでの長さが足り、有効期間内に送る場合を考えます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト・ESLint・Prettier を実行します。テストではリクエスト本文を値として比べるので、API キーは要りません。解答例は挑戦 5 回のあとか合格後に開けます。

## 参照元

- [複数の区切りの置き方（英語）](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#explicit-cache-breakpoints)
- [変更がキャッシュに影響する範囲（英語）](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#what-invalidates-the-cache)
- [入力の差と使用量の読み合わせ（英語）](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics#reading-diagnostics-alongside-usage)
