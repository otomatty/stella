# 教材の参照元

方針は [新設計05](../../docs/curriculum/05-sources-and-attribution.md)、適用範囲は [07 §9.1](../../docs/curriculum/07-stella-adoption-redesign.md#91-残す講座への適用決定) が正本です。単元＝モジュールです。参照元を整えるために旧講座を format 2 へ移す必要はありません。

## 書く順序

1. `sources/registry.json` に資料を登録します。IDは改訂を区別する名前にし、承認・公開済みの資料を書き換えず新しいIDを追加します。資料名・発行主体・個別URL・読む節・言語・資料の版・確認日を記録します。読む節 (`section`) はページの見出しの表記で書き、複数あるときは ` / ` で区切ります。技術・資料群のトップページや目次 (MDN の `/docs/Web`・`/docs/Web/HTML`、`/docs`・`/guide` で終わるURLなど) は、節名を書いても根拠にできません。更新型の資料は `documentVersion.kind: rolling` とし、取得できる改訂番号を `revision` に残します。
2. 単元の `references.json` を schemaVersion `2.1` で作ります。`unitId` は `<slug>/<module>@<版>` で、版には `1` や `1.0.0` のような数字またはドット区切りの数字を使います。`contentHash` はその版で参照元を確認した単元の内容指紋です ([単元の版と内容の指紋](#単元の版と内容の指紋))。`environmentRef` は `<環境ID>@<版>`、`uses` は使用箇所ごとの記録です。環境IDは `environments/<ID>.json` の版と一致させます。
3. 各 `uses` に公開ファイルの相対パス `contentId`、`sourceRefs`、何を裏付けたかを示す `usedFor`、`authorship`、`reuse`、`reviewStatus` を書きます。解説・参考例・図・課題の対応は講師が確認します。図は `l1-…/t1-…/assets/図.svg` のように個別に記録し、本文に埋め込んだ図の出典も近くに表示します。非公開領域は対応先にしません。
4. `slides.md`・`doc.md`・`knowledge.md`・旧形式の `practice.md` の冒頭に `sourceRefs: [SRC-…]` を持つ front-matter を置きます。課題は `task.json` の既存の `sources` を使います。単元の対応表とIDの集合を一致させます。
5. 草稿は `draft` で保存します。講師が資料・対象版・利用条件と本文・受入条件の対応を確認してから、資料の `review.status` と各使用箇所の `reviewStatus` を `approved` にします。資料の承認には `reviewer`・`reviewedAt`・`scope` が必要です。AIによる調査・照合を講師承認として記録しません。
6. `bun run content:check` を実行し、学習画面・IDE・PDFの表示も確認します。

```json
{
  "schemaVersion": "2.1",
  "unitId": "dev-env-basics/m0-first-page@1",
  "contentHash": "<hash:unit が表示する64桁の指紋>",
  "environmentRef": "static-web-01@1",
  "uses": [{
    "contentId": "tasks/q01-first-page/README.md",
    "sourceRefs": ["SRC-mdn-html-20261005"],
    "usedFor": "教材独自の課題。HTML文書と見出しの受入条件",
    "authorship": "original-exercise",
    "reuse": "concept-reference",
    "reviewStatus": "draft"
  }]
}
```

独自制作だけの箇所は `authorship: original` または `original-exercise`、`reuse: original`、`sourceRefs: []` と用途を記録できます。概念を資料に依拠する箇所にはその資料を付けます。引用 (`quote`・`reprint`) は `quotation`、改変 (`adapt-code`・`adapt-diagram`) は `adapted`、要約 (`summary`) は `concept-reference` に限り、利用方法と制作区分を両方向で一致させます。`quote`・`reprint`・`adapt-code`・`adapt-diagram` には `attribution` の `text`・`creator`・`scope`・`conditionsUrl`・`checkedAt`・`displayAt` を追加します。`displayAt` は利用する公開ファイルの `contentId` です。必要な表示を本文・図の近くと一覧に残します。

書籍は `kind: book` とし、`book` に `isbn`・`year`・`edition`・`pages`・`textChecked` を記録します。出版社の紹介を読んだだけで本文を確認済みにしません。節名・版は資料側の表記を使い、技術のトップページだけを根拠にしません。

## 配信と履歴

本文の出典、単元末尾の一覧、課題のREADMEと `.stella/task.json` の公開出典は同じ台帳から生成します。IDEの課題確認パネルにも表示します。PDFはLMSへ投入する本文を使うため、出典が変わると内容ハッシュと配布版も変わります。新形式は公開解説・課題文と出典を配布し、知識問題・解答・非公開素材はPDFに含めません。講師の確認者・確認範囲など内部レビュー記録は受講者への配布manifestに載せません。

講座に出典のない旧単元の本文・PDFは維持します。対応を整えた旧単元には同じ出典表示を加えます。

## 単元の版と内容の指紋

`unitId` の版は、参照元と本文・課題の対応を確認した単元の内容を指します。`contentHash` にその内容の指紋を記録し、`bun run content:check` が今の内容と照合します。同じ版のまま本文・コード・課題・解答・評価・画像・環境や `course.json` の教材に関わる項目を変えると一致しなくなり、新形式の単元と、新規・改訂した旧単元ではエラーになります (未改訂の旧単元は警告)。受講途中の版を上書きしないよう、内容を改訂したら新しい版にします。

1. `unitId` の版を上げます (`@1` → `@2`)。
2. 改訂した箇所の参照元と本文・課題の対応を確認し直し、`uses` を更新します。
3. `bun run --filter=@stella/content hash:unit -- <slug>/<module>` が表示する指紋を `contentHash` に記録します。

指紋の範囲は次節の旧単元の改訂判定と同じです。`references.json` の編集と、front-matter の `sourceRefs`・課題の `sources` の付け替えだけでは指紋は変わらず、版も上げません。検査は指紋の一致までしか見ないので、レビューでは `contentHash` の変更に版の更新が伴っているかを確認します。

## 旧単元の改訂を判定する

新形式は初回公開から必須です。旧形式では新規単元と内容を改訂した単元の全公開教材を必須にし、未改訂単元の不足は警告にします。`sources/legacy-units.json` は導入時点の旧単元の内容指紋です。**教材を改訂したときに基準を再生成しません。** 本文・コード・課題・解答・評価・画像・環境の変更は内容改訂として扱います。前提・parentの付け替え、参照元の追記だけでは指紋を変えません。

指紋には `course.json` の教材に関わる項目も含めます。単元名と `exercises` は該当単元のものだけを含め、講座のタイトル・説明・到達目標などは全単元に反映します。`exercises` の演習は ID・題名に加えて、seed が `packages/shared/src/problems` から引く課題定義 (説明・スターター・テスト・解答・採点設定) も含めるので、同じIDのまま課題を直しても改訂になります。前提・parent・扇への配置と予定時間 (`plannedHours`、学習ペースの見積もり) は除外し、JSONのキー順や空白だけの違いは正規化します。指紋の計算方法を更新する場合は、`bun run --filter=@stella/content baseline:legacy` で記録済みの `baseCommit` の教材と課題定義から基準を再計算し、`references.json` の `contentHash` も `hash:unit` で記録し直します (内容は変わっていないので版は上げません)。

文字の差分から誤字だけか内容改訂かは自動で判断できません。誤字・表記・レイアウトだけの場合は、講師が差分を確認して `exemptions` に単元ID・変更後の `contentHash`・`reason`・`reviewer`・`reviewedAt` を残します。`reviewedAt` は実在する日付を YYYY-MM-DD で書きます。`2026-02-30` のように形だけ合う日付の例外は効きません。例外はその内容指紋だけに有効で、新形式の必須検査は免除しません。指紋は `bun run --filter=@stella/content hash:unit -- <slug>/<module>` で確かめます (`src/check-source-references.ts` の `unitContentHash`)。

## 週次のリンク確認

`.github/workflows/source-links.yml` が週1回と手動実行で台帳のURLを調べます。

- 404/410は削除としてジョブを失敗させます。教材や台帳は自動で削除しません。
- URLの `#` はページ内のID、台帳の `section` はHTMLの見出し (h1〜h6) と照合します。空白・全角半角・大文字小文字の違いは区別しません。書籍の節とHTML以外の資料は照合しません。
- タイムアウト・通信障害・アクセス制限・サーバー障害・アンカー未検出・節の見出し未検出は削除と分け、手動確認待ちとしてJSONレポート・ジョブサマリ・90日保存のartifactに残します。これらだけでは削除扱いの失敗にしません。
- 人がブラウザーでページと読む節を確認し、`sources/link-checks.json` に `sourceRef`・`url`・`checkedAt`・`reviewer`・`result` (`available` / `removed`)・`note` と、確かめた内容として台帳の `section` (表記のまま)・レポートの理由 `reason` (`timeout`・`section-missing` など)・`section-missing` のときは見つからなかった節 `missingSections` を追加します。資料・URL・`section`・理由が同じで、見つからない節が確かめた範囲に収まる直近7日以内の記録だけを週次レポートに添えます。台帳の節を書き換えた・理由が変わった・新たな節を見失った資料は確認し直します。`section`・`reason` の無い記録は何を確かめたか分からないので添えません。将来日付は使いません。削除と確認した記録はジョブの失敗対象です。

リンクの応答が正常でも内容・対象版・利用条件が正しいとは限りません。公開・技術更新時の講師レビューで節と本文の対応を再確認します。
