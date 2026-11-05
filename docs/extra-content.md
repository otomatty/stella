# Extra 講座を stella の外に置く

stella は公開リポジトリです。Extra 講座 (`course.json` の `audience: granted`。講師・管理者が「Extra 講座」画面で割り当てた人にだけ出る) のうち、社外の研修、未出題の確認問題、解答例のように stella へ置きたくないものは、別の非公開リポジトリに置きます。

stella 側の受け口は `packages/content/src/extra-content.ts` です。外部リポジトリの CI とひな型は、そのリポジトリ側で作ります。

## 流れ

外部リポジトリの GitHub Actions は、次の順で動きます。

1. 本番にデプロイ済みの stella のコミットを取得し、作業用の写し (`.stella/`) を作ります。写しのルートには `.stella-extra-workspace` を置きます。
2. 写しの `packages/content` に、外部リポジトリの講座と台帳を重ねます。`bun run packages/content/scripts/extra-content.ts overlay --from <外部リポジトリ>` です。マーカーの無い stella では、このコマンドはファイルを書かずに終了コード 1 で止まります。
3. 写しの上で、stella の既存のコマンドをそのまま流します。`deploy:prepare:content` のあと、`content:check` → `content:upload:remote` → `content:pdf:sync:remote` → `db:seed:remote:content` です。

デプロイ済みのコミットを使うのは、stella の講座の行を D1 で動かさないためです。seed は変わった行だけを書きます。写しの stella 側が本番と同じなら、書き込まれるのは Extra 講座の分だけです。

stella の通常のデプロイは、これまでどおり stella の講座だけを入れます。seed が消すのは `RETIRED_STAGES` に書いた講座だけなので、外部リポジトリから入った講座は stella のデプロイでは消えません。講座ごとのコーディング規則 (`courses/<slug>/coding-rules.md`) も消えません。seed は、その checkout の範囲 (共通の規則と、その checkout の `courses/` にある講座) の規則だけを入れ替えます。

`content:check` は講座のコードを実行します。解答例、誤答、テストを runner が動かします。`npm ci` や `dotnet test` などです。このとき環境変数に Cloudflare の鍵や `GITHUB_TOKEN` があると、講座のコードから読めます。`content:check` は秘密を持たないジョブで流します。pull request の検査がそれです。本番に入れるジョブは、`content:check` を秘密を外した環境で流すか、検査のジョブの結果を待ってから入れるだけにします。外部リポジトリのひな型の `scripts/stella.mjs` は、`content:check` を秘密の環境変数を外した環境で起動します。講座のコードを書けるのは、そのリポジトリに書き込める人だけにします。外部からの pull request のコードは、秘密のあるジョブで動かしません。

重ねる処理は作業用の写しで 1 回だけです。`packages/content/.extra-overlay.json` が既にある写しでは止まります。やり直すときは写しを作り直します。

## 外部リポジトリの形

```text
<外部リポジトリ>/
  stella-extra.json          # { schemaVersion: 1, name, courses }
  courses/<slug>/...         # packages/content/courses/<slug>/ と同じ形 (format 2)
  skills.json                # 任意。足すスキルだけ
  patterns.json              # 任意。足すパターンだけ
  sources/registry.json      # 任意。足す参照元だけ (sources 配列)
  environments/<id>.json     # 任意。足す環境台帳だけ
```

`stella-extra.json` の `schemaVersion` は 1 です。`name` は英小文字と数字だけで、ハイフンは付けません。先頭は英小文字か数字です。使える名前は stella の `packages/content/extra-repositories.json` に登録したものだけです。登録が無い名前では止まります。`courses` の slug は英小文字・数字・ハイフンで、先頭は英小文字か数字です。各 slug は、その `name` に `-` を足した形で始めます (`csharp` なら `csharp-`)。`courses` は空にできず、slug は重複できません。

`courses` に書いた slug ごとに `courses/<slug>/course.json` が要ります。`courses/` の下に、`courses` へ書いていないフォルダーがあると止まります。書き忘れに気づくためです。

各講座の `audience` は `granted` です。`category` は `packages/shared/src/skill-map/islands.ts` の島のカテゴリのどれかです。stella の講座と slug が同じときは止まります。stella で退役した slug も使えません。一覧は `packages/shared/src/curriculum/retired-stages.ts` の `RETIRED_STAGES` です。seed が同じ ID のステージを消すので、別の slug にします。`course.json` の `tenantId` を書かないときは `ses` です。

台帳は stella の同じファイルの後ろに足します。`skills.json` と `patterns.json` は配列、`sources/registry.json` は `sources` 配列です。`id` が stella の台帳と重なると止まります。`environments/<id>.json` は写します。同じ名前が stella にあると止まります。

外部リポジトリの一番上に `coding-rules.md` は置けません。講座の規則は `courses/<slug>/coding-rules.md` に書きます。講座フォルダーと一緒に写ります。

外部リポジトリの中のシンボリックリンクは、たどらずに止まります。写すのはファイルとフォルダーだけです。

## CI に置く秘密と変数

教材の流し込みの前に `bun run deploy:prepare:content` を実行します (`apps/api/scripts/prepare-deploy.ts --content-only`)。D1 `stella-db` の ID を Cloudflare の API で解いて、その checkout の `apps/api/wrangler.toml` に書きます。教材の公開 URL も確かめます。Better Auth の署名鍵と AI の一次レビューの鍵は見ません。

秘密:

| 名前 | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | D1 の参照と seed (D1: Edit)、R2 への書き込み (Workers R2 Storage: Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | `apps/api/deployment.json` の `accountId` と一致させる |
| `PDF_KEY_SALT` | 配布 PDF の R2 キーを HMAC にする。本番の stella と同じ値にする |

外部リポジトリの CI は、stella 本体の講座も含めた写しで PDF の同期と seed を流します。`PDF_KEY_SALT` が違うと、stella 本体の講座の PDF まで別のキーで作り直してアップロードし、seed が本体の講座の資料の行を書き換えます (次の stella のデプロイで戻ります)。`VITE_MATERIALS_BASE_URL` も本番と同じ値にします。

変数:

| 名前 | 用途 |
| --- | --- |
| `VITE_MATERIALS_BASE_URL` | 教材の公開 HTTPS URL。本番の stella と同じ値にする。ユーザー名、パスワード、クエリ、フラグメントは付けない |

`db:seed:remote:content` には、PDF sync が書いたマニフェストのパスを `PDF_MANIFEST` で渡します。既定の出力は `packages/content/dist/pdf-manifest.json` です。秘密ではありません。未設定の seed は PDF の行を書きません。

`content:check` は講座のコードを実行するので、上の秘密がある環境では流しません。解答例、誤答、テストを runner が動かします。`npm ci` や `dotnet test` などです。秘密が環境変数にあると、講座のコードから読めます。`content:check` は秘密を持たないジョブ (pull request の検査) で流します。本番に入れるジョブは、`content:check` を秘密を外した環境で流すか、検査のジョブの結果を待ってから入れるだけにします。外部リポジトリのひな型の `scripts/stella.mjs` は、`content:check` を秘密の環境変数を外した環境で起動します。講座のコードを書けるのは、そのリポジトリに書き込める人だけにします。外部からの pull request のコードは、秘密のあるジョブで動かしません。

## 受講者に出す

seed のあと、講師または管理者が「Extra 講座」画面 (`/stage-grants`) で受講者に割り当てます。割り当てた人のスキルツリーにだけ出ます。受講開始は本人の自己開始のままです。

## 公開範囲

解答例、レビュー素材、未出題の類題は課題の `private/` に置きます。中身は D1 にだけ入り、受講者向け API と配布物からは外れます。

図解、サムネイル、配布 PDF は公開の R2 バケット `stella-materials-public` に置かれます。PDF のキーは `PDF_KEY_SALT` で推測しにくくします。図解とサムネイルのキーは講座の slug とファイル名から作るので、slug が分かれば URL を組み立てられます。人に見せたくない内容は画像に入れないでください。slug と講座名に個人名を入れないでください。R2 のキーと D1 に残ります。

## stella の講座を退役・改名したとき

外部の講座の `prerequisites` や `parent` が、stella から消えた slug や名前の変わった slug を指していると、外部リポジトリの `content:check` が落ちます。stella 側の退役や改名に合わせて、外部リポジトリの前提を直します。

## 新しい島

島のカテゴリは stella の `packages/shared/src/skill-map/islands.ts` に足します。島の名前は stella に公開されます。旧画面が知らない島を本土の扇に混ぜないよう、`SKILL_MAP_ISLAND_MIN_TIERS` と Web の `tiers` も一緒に上げます。C# の島は `tiers=6` です。

## 手元での確かめ方

外部リポジトリで `node scripts/stella.mjs check` を使います。このスクリプトは外部リポジトリ側の依頼で作ります。stella の作業フォルダーで `overlay` は実行しません。
