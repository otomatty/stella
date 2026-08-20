# デイリー復習(SRS)機能 設計書

日付: 2026-08-20
ステータス: 承認済み

## 目的

学習者がクイズで解いた問題を、SM-2ベースの間隔反復(SRS)で毎日再出題し、知識の定着を図る。誤答した問題は期日リセットにより自然に優先され、順調な問題は間隔が伸びていく。

## 決定事項

| 論点 | 決定 |
|---|---|
| アルゴリズム | SM-2(2値入力: 正解=quality 5、誤答=quality 2) |
| カード化の対象 | クイズで解答した全問題(正解・誤答とも) |
| 1日の出題量 | 上限20問(due古い順)・下限5問(期日が近いカードを前倒し補充) |
| 誤答の扱い | reps=0にリセット、翌日due(同日再出題はしない) |
| 本編クイズとの関係 | 完全別枠。`quiz_attempts` に書かず、`max_attempts` を消費しない |
| ストリーク/学習時間 | 今回は反映しない(`study_activity` に書かない) |
| 日付境界 | 既存 `toStudyDate`(JST固定オフセット)を使用 |

## 1. SM-2コアロジック — `packages/shared/src/srs/sm2.ts`

純粋関数。入力「現在のカード状態 + 正誤(2値)」→ 出力「次のカード状態」。

- カード状態: `ease`(初期2.5、下限1.3)、`intervalDays`、`reps`(連続正解数)
- 正解: reps 1回目 → 1日後、2回目 → 6日後、以降 → `round(intervalDays × ease)`。easeはSM-2の式で更新(q=5でわずかに増加)
- 誤答: reps=0、intervalDays=1(翌日due)。ease減少(q=2の式、下限1.3)
- due日付の算出は呼び出し側(`toStudyDate` + `addStudyDays`)が行い、sm2.ts は日数だけ返す

Vitestユニットテストを同居させる(`packages/shared/src/srs/sm2.test.ts`)。

## 2. D1スキーマ — 新テーブル2つ(新規migration)

### `review_cards`

| カラム | 型/制約 |
|---|---|
| `id` | PK (uuid) |
| `tenant_id` | not null |
| `user_id` | not null |
| `question_id` | FK → `quiz_questions.id` on delete cascade |
| `ease` | real, 初期2.5 |
| `interval_days` | integer |
| `reps` | integer |
| `due_date` | text (JSTのYYYY-MM-DD) |
| `last_reviewed_at` | integer (epoch ms) |
| `created_at` | integer |

unique `(user_id, question_id)`。index `(user_id, due_date)`。

### `review_logs`

1解答=1行の追記ログ。「今日の解答数」の判定と、将来のアルゴリズム移行(FSRS等)用の学習データを兼ねる。

| カラム | 型/制約 |
|---|---|
| `id` | PK (uuid) |
| `tenant_id` / `user_id` / `card_id` / `question_id` | not null |
| `correct` | integer (0/1) |
| `answered_at` | integer (epoch ms) |

index `(user_id, answered_at)`。

デイリーセット保存テーブルは作らない。「今日の出題」はdueカード+当日ログから毎回導出できる(誤答は翌日dueになるため、日中にセットが変動しない)。

## 3. カードの生成と更新

- **クイズ受験時**: 既存 `POST /api/quiz/:quizId/attempt`(`apps/api/src/routes/quiz.ts`)の採点後に、設問ごとにカードをupsert。新規なら正誤で初期化、既存ならSM-2で更新。クイズ再受験も復習解答と同じSM-2入力として一本化する
- **バックフィル**: 移行スクリプトは書かない。初回 `GET /api/srs/today` 時に「`quiz_attempts` はあるがカードがない」ユーザーへ、各クイズの最新受験の `answers` JSONと正解オプションを突き合わせて遅延生成する

## 4. API — `apps/api/src/routes/srs.ts`

講師添削(`review-draft` 等)と名前が衝突するためルート名は `srs`。認可は既存パターン(JWT + テナント + active enrollment)。

### `GET /api/srs/today`

1. 必要ならバックフィル(§3)
2. 当日(`toStudyDate`)の解答数を `review_logs` から算出
3. dueカード(`due_date <= today`、activeなenrollmentのコースの問題のみ)を古い順に `20 − 当日解答数` 件
4. 「当日解答数 + 3の件数」が5未満なら、dueでないカードを `due_date` が近い順に前倒し補充し、合計が5になるまで足す
5. 設問は既存のサニタイズ形式(`is_correct` / `explanation` 除去、`LearnerQuizQuestion` 相当)で返す

レスポンス: `{ questions: [...], answeredToday, dueTotal }`

### `POST /api/srs/answer`

Body: `{ questionId, selectedOptionIds }`

1. 対象問題への認可確認(enrollment経由)
2. 採点 — `quiz.ts` の正解集合完全一致ロジックを共用関数に切り出して利用
3. カードをSM-2で更新、`review_logs` に追記
4. レスポンス: `{ correct, explanation, correctOptionIds, card: { dueDate, intervalDays } }`

## 5. Web UI

- **ダッシュボード**(`apps/web/src/components/learner/LearnerDashboard.tsx`): KPIカード群の下に「今日の復習」カードを追加。残りN問/完了を表示、クリックで `/review` へ。データ取得は `useStudyActivity` と同パターンのhook(`useSrsToday`)
- **復習ページ** `/review`: 新コンポーネント `ReviewSession.tsx`。1問ずつ出題 → 解答 → 即座に正誤+解説表示 → 次へ。全問終了で完了画面(今日の解答数と正解数)。`QuizPlayer` とはフローが異なる(一括提出ではなく逐次フィードバック)ため別実装とし、選択肢UI(single=ラジオ、multiple=チェックボックス)のパターンのみ流用

## 6. テスト

- `sm2.test.ts` — 初回正解/2回目/3回目以降の間隔、誤答リセット、ease下限のユニットテスト
- `smoke:core`(`apps/api/scripts/core-loop-smoke.ts`)に復習ステップを追加: クイズを誤答 → 当日の `/api/srs/today` には出ない(誤答は翌日due・同日再出題なしの検証)→ `/api/srs/answer` で正解を2回送信 → SM-2の間隔が 1日 → 6日 と伸びる → `answered_today` が増える、をアサート(due当日の出題リストはHTTPだけでは日付を跨げないためスモーク対象外)

## 設計判断メモ

- **修了コース(enrollment が `completed`)は出題しない。** 出題・解答とも本編クイズと同じ「published + active enrollment」条件に揃える。修了証発行で enrollment が `completed` になるとそのコースの復習カードはキューから外れる。定着目的では修了後も復習を続けたい可能性があるが、閲覧権限の一貫性を優先して今回は本編と同条件とする(変える場合は `READABLE_ENROLLMENT_STATUSES` に揃えて出題・解答の両方を更新する)。

## スコープ外(今回はやらない)

- FSRS等への移行(`review_logs` がその布石)
- 復習のストリーク/`study_activity` への反映
- プッシュ通知・リマインダー
- 未解答問題の先行出題(Ankiのnew cards方式)
- 出題数のユーザー設定化(定数 20/5 で固定)
