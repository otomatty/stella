# 指示と資料を分ける

社内の手引きに答えるアシスタントのプロンプトを、XML のタグで区切って組み立てます。`src/prompt.js` の 2 つの関数を直してください。いまの実装は、質問・指示・資料をそのままつないでいて、どこまでが指示でどこからが資料かが分かりません。資料が質問より後ろにあるのも、長い資料に向かない並べ方です。

## 作るもの

### `buildTaggedPrompt(input)`

`input` の値から、プロンプトの文字列を作ります。

| 値 | 中身 |
| --- | --- |
| `documents` | 資料の配列。1 件は `{ source, content }`(出どころと本文)。空のこともある |
| `examples` | 例の配列。1 件は `{ question, answer }`。空のこともある |
| `instructions` | 指示の文 |
| `question` | 質問の文 |

- 次の順に、節を空行(`\n\n`)でつなぎます。資料を先頭に、質問を最後に置きます。
  1. `<documents>`: 資料を 1 件ずつ `<document index="番号">` で包みます。番号は 1 から数えます。中に `<source>` と `<document_content>` を入れます
  2. `<examples>`: 例を 1 件ずつ `<example>` で包みます。中に `<question>` と `<answer>` を入れます
  3. `<instructions>`: 指示の文
  4. `<question>`: 質問の文
- 資料がなければ `<documents>` の節を、例がなければ `<examples>` の節を入れません。
- タグは 1 行に 1 つ書き、中身はタグの次の行に書きます。同じ節の中の行は `\n` でつなぎます。
- 受け取った配列は書き換えません。

資料が 1 件、例が 1 件のときは、次の文字列になります。

```xml
<documents>
<document index="1">
<source>
就業規則.pdf
</source>
<document_content>
交通費は翌月 5 日までに申請する。
</document_content>
</document>
</documents>

<examples>
<example>
<question>
領収書は要りますか？
</question>
<answer>
要ります。
</answer>
</example>
</examples>

<instructions>
資料だけを根拠に、答えを answer のタグの中に書いてください。
</instructions>

<question>
交通費の申請の締め切りはいつですか？
</question>
```

### `readTag(text, tag)`

応答の文章から、`<tag>` と `</tag>` に挟まれた中身を取り出します。

- 中身は、前後の空白と改行を除いて返します。
- 同じタグが複数あれば、最初の中身を返します。
- 開くタグか閉じるタグが見つからなければ `null` を返します。

```js
readTag("確認しました。\n<answer>\n翌月 5 日までです。\n</answer>", "answer"); // => "翌月 5 日までです。"
readTag("翌月 5 日までです。", "answer"); // => null
```

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストと設定のファイルは書き換えません。

作ったプロンプトを本物の API に送り、答えが `<answer>` のタグの中に返るかを確かめるのは任意です(費用がかかります)。
