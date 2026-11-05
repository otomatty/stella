# 外部リポジトリで Extra ステージを書く

正本は `docs/extra-content.md` です。ここは、その文書のどこを読むかと、手元のコマンドの対応です。パスは外部リポジトリの形です。文書を読むときは `.stella/packages/content/...` と `.stella/docs/extra-content.md` を開きます。

## 形

```text
<外部リポジトリ>/
  stella-extra.json          # { schemaVersion: 1, name, stages }
  stages/<slug>/stage.json   # format 2。本体の stages/<slug>/ と同じ木
  skills.json                # 任意。足すスキルだけ
  patterns.json              # 任意。足すパターンだけ
  sources/registry.json      # 任意。足す参照元だけ (sources 配列)
  environments/<id>.json     # 任意。足す環境台帳だけ
  scripts/stella.mjs         # このリポジトリ側の入口。stella 本体には無い
```

`stella-extra.json` の `schemaVersion` は 1 です。`name` は英小文字と数字だけで、ハイフンは付けません。先頭は英小文字か数字です。使える名前は stella の `packages/content/extra-repositories.json` に登録したものだけです。`stages` の slug は英小文字・数字・ハイフンで、先頭は英小文字か数字です。各 slug は `<name>-` で始めます。`stages` は空にできず、slug は重複できません。`stages` に書いた slug ごとに `stages/<slug>/stage.json` が要ります。書いていないフォルダーが `stages/` にあると止まります。旧い形 (`courses` キーと `courses/<slug>/course.json`) も overlay は受け付けます。`stages` と `courses` を両方書くと止まります。

各ステージの `audience` は `granted` です。`category` は `.stella/packages/shared/src/skill-map/islands.ts` の島のどれかです。`prerequisites` は、overlay したあとの写しにあるステージの slug です。同じリポジトリの別の Extra ステージも書けますが、線の親 (`parent`) をたどると stella の catalog のステージに着く必要があります。stella のステージと同じ slug は使えません。stella で退役した slug (`packages/shared/src/curriculum/retired-stages.ts`) も使えません。seed が同じ ID のステージを消します。

台帳は stella の同じファイルの後ろに足します。`id` が stella の台帳と重なると止まります。環境台帳も同じ名前が stella にあると止まります。リポジトリの一番上に `coding-rules.md` は置けません。ステージの規則は `stages/<slug>/coding-rules.md` です。シンボリックリンクはたどらずに止まります。

slug とステージ名に受講者の名前を入れないでください。R2 のキーと D1 に残ります。

## コマンド

入口は外部リポジトリの `scripts/stella.mjs` です。stella 本体の作業フォルダーでは `overlay` を実行しません。

| コマンド | すること |
| --- | --- |
| `node scripts/stella.mjs setup` | 本番にデプロイ済みの stella のコミットを取り、`.stella/` を作る。写しのルートに `.stella-extra-workspace` を置く |
| `node scripts/stella.mjs overlay` | 写しの `packages/content` に、このリポジトリのステージと台帳を 1 回重ねる |
| `node scripts/stella.mjs check` | 重ねた写しで `content:check` を流す |
| `node scripts/stella.mjs skill` | 写しの `.claude/skills/stella-course/` を、この環境で使うスキルの場所へ取り込む |

写しが無いときは `setup` を先に実行します。文書とテンプレートは `.stella/` から読み、編集するのは外部リポジトリの `stages/` と足す台帳です。`.stella/` の中を直しても、次の `setup` で消えます。

重ねる処理の実体は、写しの中の `bun run packages/content/scripts/extra-content.ts overlay --from <外部リポジトリ>` です。マーカーの無い stella ではファイルを書かずに終了コード 1 で止まります。`packages/content/.extra-overlay.json` が既にある写しでも止まります。やり直すときは写しを作り直します。

## 本番に入るまで

1. 外部リポジトリの main へ merge する。
2. Actions が、デプロイ済みの stella のコミットで写しを作り、ステージを重ねる。
3. 写しの上で `deploy:prepare:content` のあと、`content:check` → `content:upload:remote` → `content:pdf:sync:remote` → `db:seed:remote:content` を流す。
4. 講師か管理者がステージ管理 (`/stages`) の星の詳細の「受講者を割り当てる」で受講者に割り当てる (`/stage-grants` は `/stages` へ送るだけ)。割り当てはツリーに出すだけで、受講開始は本人の自己開始です。

デプロイ済みのコミットを使うのは、stella のステージの行を D1 で動かさないためです。seed は変わった行だけを書きます。写しの stella 側が本番と同じなら、書き込まれるのは Extra ステージの分です。stella の通常のデプロイは stella のステージだけを入れ、`RETIRED_STAGES` 以外は消しません。外部から入ったステージは stella のデプロイでは消えません。

## 公開範囲

解答例、レビュー素材、未出題の類題は課題の `private/` に置きます。中身は D1 にだけ入り、受講者向け API と配布物からは外れます。

図解、サムネイル、配布 PDF は公開の R2 バケット `stella-materials-public` に置かれます。PDF のキーは `PDF_KEY_SALT` で推測しにくくします。図解とサムネイルのキーはステージの slug とファイル名から作るので、slug が分かれば URL を組み立てられます。人に見せたくない内容は画像に入れないでください。

CI の秘密と変数は `docs/extra-content.md` の「CI に置く秘密と変数」です。`PDF_KEY_SALT` と `VITE_MATERIALS_BASE_URL` は本番の stella と同じ値にします。外部の CI は本体のステージも含めた写しで PDF の同期と seed を流すので、値が違うと本体のステージの PDF まで別のキーで作り直し、seed が本体の資料の行を書き換えます。

## 新しい島

島のカテゴリは stella の `packages/shared/src/skill-map/islands.ts` に足します。島の名前は stella に公開されます。旧画面が知らない島を本土の扇に混ぜないよう、`SKILL_MAP_ISLAND_MIN_TIERS` と Web の `tiers` も一緒に上げます。C# の島は `tiers=6` です。外部リポジトリの `category` には、その写しが知っている島の名前だけを書けます。

## stella 本体のステージが変わったとき

外部のステージの `prerequisites` や `parent` が、stella から消えた slug や名前の変わった slug を指していると、写しの `content:check` が落ちます。検査を弱めずに、外部リポジトリの前提を、いまの stella の slug に直します。写しはデプロイ済みのコミットなので、stella の main に入った直後ではなく、そのコミットが本番に載ってから `setup` し直すと、落ちる理由が本番と揃います。
