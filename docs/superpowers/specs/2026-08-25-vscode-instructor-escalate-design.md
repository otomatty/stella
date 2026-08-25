# VS Code「講師に引き継ぐ」 設計書 (Issue #9 P0)

日付: 2026-08-25
ステータス: 実装済み

## 目的

自動採点で詰まった学習者が、 その場のコードと採点失敗サマリを添えて講師の添削キューへ
エスカレーションできるようにする。 Issue #9 の原文 (2026-05 / PracticeWorkspace +
localStorage 前提) のうち、 講師 UI・D1 永続化・学習者への結果返却は #61 で実装済みで、
**残っていたのは「学習者が講師キューに物を流す正規経路」だけ**だった。

現行プロダクトではコード演習は VS Code 拡張で自動採点され、 通れば
`/api/lesson-progress` で完了になる。 通らなかった学習者は行き止まりで、 講師には何も
届かない。 ここを埋める。

## 決定事項

| 論点 | 決定 |
|---|---|
| 入口 | **VS Code のみ**。 Web のコードレッスンは「VS Code で開く」しか無いので、 モバイル Web からのエスカレーションは出さない |
| 出すタイミング | **採点して未クリアだった直後だけ**。 クリア済み / 未採点では出さない (自動採点で通る課題を講師キューに流さない) |
| 同一課題の再送 | **upsert**。 未添削 (`pending`) が残っていれば同じ行を上書きして `attempt++`。 添削済みなら新しい行を作って `attempt++`。 同時 POST でも pending が 2 行にならないよう、 判定を SQL 1 文に閉じ込める |
| レッスン完了 | **変えない**。 引き継いでも完了にはしない。 完了は従来どおり自動採点クリア |
| 提出コード | 演習フォルダの全ファイルを見出しコメント付きで 1 本に連結して `submissions.code` へ (再実行はしない前提) |
| 採点サマリ | `submissions.grading_summary` (新規 JSON 列)。 独立した `inline_comments` 列は作らない (#61 と同じ判断) |
| AI 下書き | **講師が Editor を開いた時の遅延生成のまま**。 提出時のバックグラウンド生成はやらない |
| ステータス | `pending / passed / resubmit / failed` + `verdict` (現状維持)。 原文の `in_review` は導入しない |

## 1. 共有純関数 — `@falcon/shared/review`

ランタイム非依存。 拡張 / API / Web が同じ関数を使う。

### `grading-summary.ts`

- `buildGradingSummary(result, language)` — 拡張の `ExecutionResult` を D1 に載る最小形へ落とす。
  error lint のみ / 失敗テストのみ / AST の不足・禁止・パースエラーを日本語 1 行ずつ。
  lint・テストは 20 件、 各メッセージ 400 文字で打ち切る (講師が読む量と行サイズの上限)。
- `formatGradingSummaryText(summary)` — 講師 / AI プロンプト向けのプレーンテキスト整形。
- `isGradingSummary(unknown)` / `parseGradingSummary(unknown)` — 検証。 `gradingSummary` は
  **受講者が送れる値**なので、 配列かどうかだけでなく要素の形 (lint の `line` / `message`、
  test の `name`、 `language`、 件数の有限性) まで見る。 `lint: [null]` のような payload を
  通すと講師の `ReviewEditor` が `violation.line` を読む時点で落ち、 その提出を開けなくなる。
  読み出し側は形違いを `null` に落とし、 API の受け口は 400 で弾く。
- `toReviewDraftLanguage(language)` — `Assignment["language"]` を `js | ts | sql | fe-pseudo` に丸める。

### `escalation.ts`

- `concatExerciseFiles(files, entryFile)` — 入口ファイルを先頭に、 残りはパス順。 複数ファイルは
  `// ===== path =====` 見出しを挟む。 単一ファイルは見出しなし。 上限 80,000 文字 (AI 下書きのコード上限と同じ)。
- `buildEscalationSubmissionBody(input)` — `POST /api/submissions` のボディ。 優先度は `high` 固定
  (詰まっての引き継ぎは先に見てほしい)。
- `nextSubmissionAttempt(previous, requestedAttempt)` — **新しい行**の `attempt`。
  未添削の上書きは SQL 側で `attempt = attempt + 1` するので、 ここは通らない。

## 2. D1 — `0027_submission_grading_summary`

```sql
ALTER TABLE `submissions` ADD `grading_summary` text;
CREATE INDEX `submissions_tenant_student_assignment_idx`
  ON `submissions` (`tenant_id`,`student_id`,`assignment_id`);
```

index は upsert 判定の「同一課題の直近提出」検索用。

## 3. API — `POST /api/submissions`

`gradingSummary` (任意 JSON) を受け付ける。 形が違えば黙って捨てず **400**。

upsert は「読んでから id で書く」をやめ、 2 つの単一 SQL 文に分ける。 D1 は 1 文を
原子的に実行するので、 同時 POST (引き継ぎリンクの二度押しなど) でも pending は 1 行に収まる。

1. **上書き** — 同一課題の pending のうち**最新の 1 件**を引き、 `UPDATE ... WHERE id = ? AND status = 'pending'`。
   条件一致した行をまとめて更新しないのは、 本 PR 以前の API が同一課題の pending を
   複数作れたため。 既存 DB の重複行を同じ内容で塗り替えると、 キューに同じ提出が並んでしまう
   (重複行自体は触らない — 移行で受講者の提出を消さない)。
   `attempt` は SQL 側で `attempt + 1`。 `submitted_at` を打ち直し、 前回の AI 下書き
   (`ai_ready` / `ai_suggestions` / `rubric` / `review_notes` / `verdict`) と添削の打刻
   (`reviewed_at` / `reviewer_id`) を戻す。
   - 下書きを捨てるのはコードが変わっているから。
   - 打刻を戻すのは、 残したままだと再添削時に `review_completed` 通知が出ないから
     (通知は `reviewed_at` が null → 非 null の初回のみ)。
   - `status = 'pending'` を WHERE に含めるので、 読み取りと書き込みの間に講師が添削を
     確定していた場合は 0 行となり、 確定済みの添削を巻き戻さない。
2. **新規作成** — 1 で 0 行だったときだけ。 `INSERT ... SELECT ... WHERE NOT EXISTS (同一課題の pending)`。
   存在チェックを同じ文に閉じ込めるので、 同時 POST の両方が「無い」と判断して 2 行入ることがない。
   `attempt` は `nextSubmissionAttempt` (直近提出 + 1、 無ければ要求値)。
   競り負けて 0 行だったときは 1 に戻ってやり直す (最大 3 周)。 「未添削あり」で INSERT を
   見送った直後に講師がその行を確定すると上書き先も消えるが、 どちらも単一 SQL 文なので
   やり直せば 上書き / 新規作成 のどちらかに必ず収束する。

返却行に `grading_summary` を足す (GET / PATCH も同じ `toRow` を通るので自動で載る)。

### PATCH の楽観ロック

講師が ReviewEditor を開いている間に学習者が引き継ぎ直すと、 講師は**見えていないコード**に
添削を確定できてしまう。 `PATCH /api/submissions/:id` は任意の `expectedSubmittedAt`
(講師が読み込んだ時点の `submitted_at`) を受け取り、 現在値と違えば **409** を返す
(割当プリセットの版チェックと同じ形)。 比較だけでは「比較 → UPDATE」の間に引き継ぎ直される
余地が残るので、 **版チェックは UPDATE の述語にも入れる** (0 行なら 409)。
解釈できない `expectedSubmittedAt` は 409 ではなく 400 (原因が分かるように)。 Web はこの値を常に送り、 409 なら講師のキャッシュを
最新化した上で「開き直してください」と案内してキューへ戻す。
`ReviewEditor` のローカル状態と AI 下書きの生成は id ではなく **id + `submittedAt`**
で管理する — 引き継ぎ直しは id を据え置きでコードだけ変えるので、 id で見ていると
古い下書きを表示し続け、 再生成も走らない。 未指定の呼び出し
(`smoke:core` の一部など) は従来どおり素通しする。

既存の Web 提出 (`AssignmentSubmitPanel`) も同じ経路を通る。 未添削の二重提出が
1 行にまとまるのは改善であり、 壊れる挙動ではない。

## 4. VS Code 拡張

```
falcon.grade → gradeActiveExercise() が { assignment, files, result } を返す
             → 未クリアなら rememberGradeRun() で控える (クリアしたら控えを捨てる)
             → 演習パネルに「講師に引き継ぐ」 リンクが出る
falcon.escalateToInstructor(assignmentId)
             → escalateToInstructor(): 控えから body を組んで POST
             → 「講師に引き継ぎました (N 回目)」
```

- 控え (`escalate.ts`) は「直近に採点して未クリアだった課題」1 件だけ。 別課題 / クリア済み /
  採点前は `canEscalate()` が false になり、 パネルにリンクを出さない。
- 控えは module 変数なので、 `onDidChangeAuth` (接続 / 切断) で必ず捨てる。 同じ VS Code に
  別の受講者が接続したとき、 前の受講者のコードを新しい JWT で提出できてしまうのを防ぐ。
- 講座名 / セクション名は木構造の親からしか取れないので、 `findCachedLessonContext()` を足した。
- パネルは `enableScripts: false` のまま。 リンクは `command:` URI
  (`enableCommandUris` に `falcon.escalateToInstructor` を追加)。
- コマンドパレットからも `FALCON: 講師に引き継ぐ` で実行できる (引数なしなら開いている課題)。

## 5. 講師 UI

- `ReviewEditor`: `grading_summary` を持つ提出には「自動採点」タブを出し、 開いた直後は
  そのタブを選ぶ (詰まりの理由から読ませる)。 ヘッダに「自動採点で未クリア」バッジ。
- `POST /api/review-draft` に課題言語 (`js | ts | sql | fe-pseudo`) と整形済み採点サマリを渡す。
  従来は常に `language: "js"` を送っていた。
- `ReviewQueue`: AI 列の「生成中」を **「未生成」** に変更。 実際の生成は講師が Editor を
  開いた時なので、 提出直後に「生成中」と出るのは誤認だった。

## 6. やらないこと (Issue #9 のスコープ外)

- 提案のインライン編集、 キューのフィルタ / ソート (disabled のまま)
- `ReviewEditor` の CodeMirror 化 (現状の行ハイライトで足りる)
- localStorage デモ経路の削除 (#63 の方針どおりデモ専用として残す)
- 面談対策の「回答の型」添削 (別 issue)
- 修了条件を `code` レッスンの自動採点に結びつける変更 (`requireAllLessons` で既にカバー)

## 7. リスク

1. **講師キューの流入量** — 優先度 `high` 固定 + 同一課題 upsert で増殖は防ぐが、 実運用で
   多すぎるようなら優先度を課題側で決める余地を残す。
2. **提出コードのサイズ** — 多ファイル課題では連結で膨らむ。 80,000 文字で打ち切り、
   打ち切った旨をコードの末尾に残す。
3. **`grading_summary` の形の変化** — `parseGradingSummary` で弾いて `null` に落とすので、
   古い行が講師 UI を壊すことはない。 受け口は 400 で弾く。
