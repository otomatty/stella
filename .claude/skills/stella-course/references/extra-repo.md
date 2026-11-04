# 外部リポジトリで Extra 講座を書く

正本は `docs/extra-content.md` です。ここは、その文書のどこを読むかと、手元のコマンドの対応です。パスは外部リポジトリの形です。文書を読むときは `.stella/packages/content/...` と `.stella/docs/extra-content.md` を開きます。

## 形

```text
<外部リポジトリ>/
  stella-extra.json          # { schemaVersion: 1, name, courses }
  courses/<slug>/...         # format 2。本体の courses/<slug>/ と同じ木
  skills.json                # 任意。足すスキルだけ
  patterns.json              # 任意。足すパターンだけ
  sources/registry.json      # 任意。足す参照元だけ (sources 配列)
  environments/<id>.json     # 任意。足す環境台帳だけ
  scripts/stella.mjs         # このリポジトリ側の入口。stella 本体には無い
```

`stella-extra.json` の `schemaVersion` は 1 です。`name` と `courses` の slug は英小文字・数字・ハイフンで、先頭は英小文字か数字です。`courses` は空にできず、slug は重複できません。`courses` に書いた slug ごとに `courses/<slug>/course.json` が要ります。書いていないフォルダーが `courses/` にあると止まります。

各講座の `audience` は `granted` です。`category` は `.stella/packages/shared/src/skill-map/islands.ts` の島のどれかです。`prerequisites` は実在する stella の講座の slug です。stella の講座と同じ slug は使えません。

台帳は stella の同じファイルの後ろに足します。`id` が stella の台帳と重なると止まります。環境台帳も同じ名前が stella にあると止まります。リポジトリの一番上に `coding-rules.md` は置けません。講座の規則は `courses/<slug>/coding-rules.md` です。シンボリックリンクはたどらずに止まります。

slug と講座名に受講者の名前を入れないでください。R2 のキーと D1 に残ります。

## コマンド

入口は外部リポジトリの `scripts/stella.mjs` です。stella 本体の作業フォルダーでは `overlay` を実行しません。

| コマンド | すること |
| --- | --- |
| `node scripts/stella.mjs setup` | 本番にデプロイ済みの stella のコミットを取り、`.stella/` を作る。写しのルートに `.stella-extra-workspace` を置く |
| `node scripts/stella.mjs overlay` | 写しの `packages/content` に、このリポジトリの講座と台帳を 1 回重ねる |
| `node scripts/stella.mjs check` | 重ねた写しで `content:check` を流す |
| `node scripts/stella.mjs skill` | 写しの `.claude/skills/stella-course/` を、この環境で使うスキルの場所へ取り込む |

写しが無いときは `setup` を先に実行します。文書とテンプレートは `.stella/` から読み、編集するのは外部リポジトリの `courses/` と足す台帳です。`.stella/` の中を直しても、次の `setup` で消えます。

重ねる処理の実体は、写しの中の `bun run packages/content/scripts/extra-content.ts overlay --from <外部リポジトリ>` です。マーカーの無い stella ではファイルを書かずに終了コード 1 で止まります。`packages/content/.extra-overlay.json` が既にある写しでも止まります。やり直すときは写しを作り直します。

## 本番に入るまで

1. 外部リポジトリの main へ merge する。
2. Actions が、デプロイ済みの stella のコミットで写しを作り、講座を重ねる。
3. 写しの上で `deploy:prepare:content` のあと、`content:check` → `content:upload:remote` → `content:pdf:sync:remote` → `db:seed:remote:content` を流す。
4. 講師か管理者が「Extra 講座」画面 (`/stage-grants`) で受講者に割り当てる。割り当てはツリーに出すだけで、受講開始は本人の自己開始です。

デプロイ済みのコミットを使うのは、stella の講座の行を D1 で動かさないためです。seed は変わった行だけを書きます。写しの stella 側が本番と同じなら、書き込まれるのは Extra 講座の分です。stella の通常のデプロイは stella の講座だけを入れ、`RETIRED_STAGES` 以外は消しません。外部から入った講座は stella のデプロイでは消えません。

## 公開範囲

解答例、レビュー素材、未出題の類題は課題の `private/` に置きます。中身は D1 にだけ入り、受講者向け API と配布物からは外れます。

図解、サムネイル、配布 PDF は公開の R2 バケット `stella-materials-public` に置かれます。PDF のキーは `PDF_KEY_SALT` で推測しにくくします。図解とサムネイルのキーは講座の slug とファイル名から作るので、slug が分かれば URL を組み立てられます。人に見せたくない内容は画像に入れないでください。

CI の秘密と変数は `docs/extra-content.md` の「CI に置く秘密と変数」です。`PDF_KEY_SALT` と `VITE_MATERIALS_BASE_URL` は本番の stella と同じ値にします。外部の CI は本体の講座も含めた写しで PDF の同期と seed を流すので、値が違うと本体の講座の PDF まで別のキーで作り直し、seed が本体の資料の行を書き換えます。

## 新しい島

島のカテゴリは stella の `packages/shared/src/skill-map/islands.ts` に足します。島の名前は stella に公開されます。旧画面が知らない島を本土の扇に混ぜないよう、`SKILL_MAP_ISLAND_MIN_TIERS` と Web の `tiers` も一緒に上げます。C# の島は `tiers=6` です。外部リポジトリの `category` には、その写しが知っている島の名前だけを書けます。

## stella 本体の講座が変わったとき

外部の講座の `prerequisites` や `parent` が、stella から消えた slug や名前の変わった slug を指していると、写しの `content:check` が落ちます。検査を弱めずに、外部リポジトリの前提を、いまの stella の slug に直します。写しはデプロイ済みのコミットなので、stella の main に入った直後ではなく、そのコミットが本番に載ってから `setup` し直すと、落ちる理由が本番と揃います。
