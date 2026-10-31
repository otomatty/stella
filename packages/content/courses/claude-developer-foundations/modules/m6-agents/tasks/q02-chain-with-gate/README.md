# 段に分けてつなぐ

社内の手引きの下書きを作るワークフローを、プロンプトの連鎖で組み立てます。「構成を作る → 構成を確かめる → 本文を書く → 長さを確かめる」のように、段ごとに出力をゲートで確かめ、条件を満たさなければ次の段へ進みません。`src/chain.js` の `runChain(input, stages)` を書き直してください。いまの実装は、段をつなぐだけで、出力を確かめていません。

## 作るもの

`runChain(input, stages)` は、`stages` を順に行い、前の段の出力を次の段の入力にします。段は次の形です。

| 値 | 中身 |
| --- | --- |
| `name` | 段の名前 |
| `run(value, context)` | 段の処理(`async`)。本物では Claude の呼び出し。`context` は `{ attempt, feedback }` |
| `check(output)` | ゲート(省略できる)。条件を満たせば `null`、満たさなければ理由の文字列を返す |
| `retries` | ゲートを通らなかったときに、その段をやり直してよい回数(省略したら 0) |

- 最初の段には `input` を、次の段からは前の段の出力を渡します。
- `run` の出力を `check` で確かめます。`check` がない段は、そのまま通ります。
- ゲートを通らなかったら、`retries` の回数まで、同じ入力でその段をやり直します。やり直すときの `context` は、`attempt` が 2, 3, … で、`feedback` が直前のゲートの理由です(最初は `attempt: 1, feedback: null`)。
- やり直しを使い切っても通らなければ、そこで止めます。次の段は呼びません。
- `run` が例外を投げたら、やり直さずにその場で止めます(送り直しは、送信の層で M2 のように行います)。
- すべての段を通ったら `{ ok: true, result: 最後の段の出力, outputs }` を、止めたら `{ ok: false, failedAt: 止まった段の名前, reason: 理由, outputs }` を返します。`outputs` は、通った段の名前ごとの出力です。`reason` は、ゲートの最後の理由か、例外の内容(`Error` ならその `message`)です。
- 段の名前が重なっていたら、どの段も呼ばずに、その名前を含むメッセージの `Error` を投げます。
- 段がなければ、`input` をそのまま `result` にします。

```js
const result = await runChain("経費の申請", [
  { name: "outline", run: makeOutline, check: (o) => (o.headings.length >= 3 ? null : "見出しが足りません"), retries: 1 },
  { name: "draft", run: writeDraft },
]);
// 構成が 2 回とも見出し不足なら
// => { ok: false, failedAt: "outline", reason: "見出しが足りません", outputs: {} }
```

## 説明欄に書くこと

提出の説明欄に、ゲートで止める理由(止めずに進むと何が起きるか)と、やり直しの回数をどこで決めたかを、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません(テストは偽の段の関数を渡します)。テストと設定のファイルは書き換えません。

段の `run` で本物の API を呼び、構成と本文を作ってみるのは任意です(費用がかかります)。
