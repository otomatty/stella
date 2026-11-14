# 教材動画ガイド (video.json)

教材動画 (トピック 1 つ = 動画 1 本) の絵コンテ `video.json` の書き方です。動画は、場面ごとのクリップをつないで作ります。スライドは映しません。

## 何を映すか

**実際の画面で見せられるものは、実際の画面で見せます。**

| 場面の種類 (`kind`) | 映すもの | 使うところ |
| --- | --- | --- |
| `view` + `shot:` | STELLA の Web・VS Code の実際の画面の静止画。見せたい場所を囲む・寄る・札を付ける・押す | 要点の説明 (ほとんどの場面) |
| `view` + `art:` | イラスト 1 枚 | つかみ (受講者の状況を絵にする) |
| `board` | 概念図。ノードにイラストを付ける | 全体の関係を 1 枚で見せるとき (主にまとめ) |

概念図だけで説明しないでください。画面の名前や手順は、言葉や図よりも、実際の画面を見せるほうが早く伝わります。概念図は「画面と画面の関係」「繰り返しの流れ」のように、1 つの画面には映らないものにだけ使います。

## 書く順番

**内容 → 絵 → 言葉** の順で書きます。言葉から書き始めないでください。

1. **学習設計 (`brief`) を書く。** その課題・トピックで、受講者に何を学んでほしいかを先に決めます。
   - `goal`: 見終えた受講者ができるようになること。1 文。「〜を説明できる」「〜の順番を言える」のように、確かめられる形で書く
   - `stuck`: 初学者がつまずく点。この動画が要る理由
   - `points`: 伝えること。**3 つまで**。1 つは 1 文
   - `leaveOut`: あえて言わないこと。仕組みの詳細・アプリの内部の話・例外の扱い・その動画の要点に要らない画面の部品は、まずここに入れる
2. **素材を決める。** `points` ごとに、どの画面のどこを見せるかを決めます。使える画面は `packages/content/shots/` にあります。無ければ撮ります (下の「素材を作る」)。
3. **場面 (`scenes`) に分け、最後に読み上げの文 (`say`) を書く。**

`points` に書いていないことは、正しくても動画に入れません。手順の細部は `doc.md` と操作の収録 (`screen.mp4`) に任せます。

## 場面の並び

| 場面 | `role` | すること |
| --- | --- | --- |
| つかみ | `hook` | 受講者が迷う点を問いにする。答えはまだ言わない |
| 要点 | `point` | `points` の 1 つを、実際の画面で説明する。`point` に番号を書く |
| まとめ | `recap` | 全体を 1 枚で見せて、`points` を言い直す。新しいことを足さない |

- 動画 1 本は 3〜6 場面、合計 60〜120 秒

## 画面の場面 (`view`) のルール

- 画面の文字は動画では小さくなります。**見せたい場所には必ず寄る (`zoom`) か、囲む (`spot`)**。画面全体を映したまま話し続けない
- 1 文で見せる場所は 1 つ。次の文で次の場所へ移る
- 押す場所は `click` で見せる (カーソルが動いて押す)。押したあとの画面は、次の文で `image` を切り替えて見せる
- 札 (`label`) は 12 字まで。画面に書いてある言葉を繰り返さず、「ここで書く」のように意味を足すときだけ使う
- 画面は実際に撮ったものだけを使う。画面を描き直した絵や、加工した画面は使わない
- 窓の枠の色と札 (Web = 青、VS Code = 紫) は自動で付きます

## 概念図 (`board`) とイラストのルール

- ノードは 6 個まで、矢印は 8 本まで、囲みは 3 個まで
- ノードにはイラスト (`art`) を付ける。小さなアイコン (`icon`) だけのノードは、イラストを用意できないときの代わりです
- ラベルはノード 10 字・囲み 12 字・矢印 6 字まで。画面で受講者が目にする言葉に合わせる
- 囲みの `tone` (`blue` / `violet`) で場所を色分けする。画面の場面の窓の色とそろえる (Web = `blue`、VS Code = `violet`)
- イラストに文字・ロゴは入れない。絵柄は `narration/art-style.md` でそろえる

## 読み上げ 1 文 (`beats`) のルール

- **1 文ごとに絵が変わること。** 画面の場面は 切り替える (`image`)・囲む (`spot`)・寄る (`zoom`)・札 (`label`)・押す (`click`)、概念図は 出す (`show`)・目立たせる (`focus` / `pulse`)・印 (`mark`)・たどる (`travel`)・寄る (`zoom`) のどれかを必ず書く。絵が変わらない文は、要らない文です
- 1 文は 40 字まで。です・ます調の話し言葉。画面のボタンの名前は「」で引用してよい。ほかの括弧・記号 (「→」「/」「…」) は使わない
- 1 場面は 1〜5 文
- 見れば分かることを言葉で繰り返さない。絵が出るのに合わせて、その意味を言う
- 次のトピックの名前・ステージの中の位置は言わない
- 読みを変えたい語は、まず読み辞書 (`narration/readings.json`) に足す。一回きりなら `speech`

## 素材を作る

```bash
# VS Code の画面: 操作の収録 (screen.mp4) からコマを取り出す。定義は shots/frames.json
bun run --filter=@stella/content video:shots

# Web の画面: ローカルで STELLA を起動して撮る。定義は apps/web/scripts/tutorials/shots/*.ts
bun run --filter=@stella/web tutorials:shots

# イラスト: video.json の art の prompt から Gemini で作る
bun run --filter=@stella/content video:art -- <トピックのパス>
bun run --filter=@stella/content video:art -- <トピックのパス> --only read,write   # 選んで作り直す
bun run --filter=@stella/content video:art -- <トピックのパス> --only write --ref read   # 絵柄の手本を指定する (既存の画像・作成対象と別の名前)
```

- ショットは `packages/content/shots/<組>/<名前>.png` と同名の `.json` (領域 `regions`)。絵コンテからは `shot:web/task` のように指す
- 領域は、Web の画面はセレクタから自動で決まります。収録のコマは `frames.json` にピクセルで書きます
- イラストはトピックの `assets/art/<名前>.png`。絵コンテからは `art:<名前>` で指す。イラストの領域は `art` の `regions` に割合 (0〜1) で書きます
- 作ったイラストは必ず目で確かめます。文字・ロゴ・不自然な手や顔があれば作り直します
- 画面が変わったら撮り直します。素材を足す・作り直すと単元の内容指紋が変わるので、`references.json` を更新します

## Gemini で読み上げ文を磨く

文を書いたら、音声を作る前に `video:polish` を通します。Gemini 4 Argon が、不自然な言い回し・冗長な文・書き言葉・難しい語・絵の繰り返し・学習設計に無い話を文ごとに指摘し、言い換え案を返します。

```bash
bun run --filter=@stella/content video:polish -- <トピックのパス>            # 案を取得して読む
bun run --filter=@stella/content video:polish -- <トピックのパス> --apply    # 保存済みの案を反映する
bun run --filter=@stella/content video:polish -- <トピックのパス> --apply --only hook#2,places#4
bun run --filter=@stella/content video:polish -- <トピックのパス> --apply --skip hook#2
```

- まず API で案を取得し、画面か `dist/video-polish/<stage>/<topicId>.md` で読みます。JSON の報告には、そのときの読み上げ文の `sayHash` も保存されます
- `--apply` は API を呼ばず、保存済みの案のうち受け入れ可能なものを反映します。`--only` は反映する文を選び、`--skip` は外します。両方同時には使えません。知らない id はエラーになります
- 報告がない場合や、取得後に文や `speech` を直した場合は反映しません。先に `video:polish` で案を取り直してください。反映後に残りの案を使う場合も取り直します
- 案は提案です。数字や新しい用語を足した案・長すぎる案は、自動では反映されません。文を削る案 (`cut`) も反映されないので、絵の動きごと見直します
- 反映したら、必ず自分で読み直します。画面の言葉とそろっているか、`points` から外れていないかを見ます
- 案を取得すると現在の文で、反映すると反映後の文で、`video.json` の `polish` に記録が残ります。そのあと文を直すと `video:check` が警告するので、もう一度通します
- `--dry-run` は API を呼ばず、ファイルも更新しません。取得に使うモデルは `VIDEO_POLISH_MODEL`・`--model` で変更できます

## 確かめ方

```bash
bun run --filter=@stella/content video:check                                   # 絵コンテの検査
bun run --filter=@stella/content video:scenes -- <トピックのパス> --stills      # 文ごとの静止画 (API を呼ばない)
bun run --filter=@stella/content video:scenes -- <トピックのパス> --tts fake    # 仮の音で動画まで
bun run --filter=@stella/content video:scenes -- <トピックのパス> --tts gemini  # 本番の音声
bun run --filter=@stella/content video:scenes -- <トピックのパス> --tts gemini --refresh-audio hook,check  # 指定した場面の音声を作り直す
```

静止画の一覧で、囲みの位置・寄ったときに文字が読めるか・札のはみ出しを見てから音声を作ります。
