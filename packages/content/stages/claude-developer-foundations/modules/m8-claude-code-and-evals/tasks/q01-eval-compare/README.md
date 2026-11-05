# 評価のセットで比べる

問い合わせを分類するプロンプトを直すたびに、良くなったかどうかを数字で確かめられるようにします。評価のセットを回して合格率を出す関数と、変更の前と後を比べる関数を作ってください。`src/eval.js` のいまの実装は、最初の 3 件しか回さず、比べるときも合格率の差しか見ていません。

## 作るもの

評価のケースは `{ id, input, expected }` の配列です。

### `exactMatch(output, testCase)`

コードで採点する関数です。`output` と `testCase.expected` を、どちらも前後の空白と改行を除いてから比べ、完全に一致すれば `true` を返します。

### `runEval(cases, generate, grade)`

| 値 | 中身 |
| --- | --- |
| `cases` | 評価のケースの配列 |
| `generate` | 入力を受け取り、答えを返す関数(`async`)。評価する仕組みそのもの。テストでは偽の関数を渡す |
| `grade` | `(output, testCase)` を受け取り、合格なら `true` を返す採点の関数(`async` でもよい) |

- すべてのケースを、配列の順に 1 件ずつ回します。`generate(testCase.input)` の答えを `grade` で採点します。
- `generate` が例外を投げたケースは、`{ id, pass: false, output: null, error: 例外の内容 }` にして、残りのケースを回し続けます(`error` は、`Error` ならその `message`)。
- `{ total: ケースの数, passed: 合格の数, rate: passed / total, results }` を返します。`results` は、ケースの順の `{ id, pass, output }`(失敗したケースは `error` も)です。
- ケースが空なら、エラーにします。ケースの `id` が重なっていたら、どのケースも回さずに、その `id` を含むメッセージの `Error` を投げます。

### `compareRuns(before, after)`

同じ評価のセットで回した、変更の前(`before`)と後(`after`)の `runEval` の結果を比べます。

- 前と後で、ケースの `id` の集まりが同じでなければ、比べずにエラーにします(並びは違ってもよい)。
- `{ before: 前の合格率, after: 後の合格率, delta: after - before, regressions, fixes }` を返します。
  - `regressions`: 前は合格で、後は不合格のケースの `id`
  - `fixes`: 前は不合格で、後は合格のケースの `id`
  - どちらも、前の結果の `results` の順に並べます。

```js
const diff = compareRuns(await runEval(cases, oldPrompt, exactMatch), await runEval(cases, newPrompt, exactMatch));
// 合格率は同じでも、悪化したケースがあれば regressions に出る
// => { before: 0.75, after: 0.75, delta: 0, regressions: ["c4"], fixes: ["c3"] }
```

## 説明欄に書くこと

提出の説明欄に、前と後で同じケースかを確かめる理由と、合格率の差だけでなく悪化したケースを返す理由を、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません(テストは偽の `generate` を渡します)。テストと設定のファイルは書き換えません。

`generate` に本物の API を呼ぶ関数を渡し、2 つのプロンプトを比べてみるのは任意です(費用がかかります)。
