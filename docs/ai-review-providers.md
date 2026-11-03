# AI 一次レビューのプロバイダーと切り替え

新形式の課題の一次レビューは Anthropic と OpenAI に対応する。接続先を変えても、教材の版の照合、入力上限、ルーブリックの検証、解答漏えいの検査、合否のしきい値、キューの回数制限は同じ処理を通す。

## ファイルの責務

`apps/api/src/lib/` の分担は次のとおり。

| ファイル | 責務 |
| --- | --- |
| `ai-review-material.ts` | 提出時の教材・規則・解答例・提出ファイルの読み出しと版の照合 |
| `ai-review-prompt.ts` | SDK に依存しないテキスト入力と行番号の組み立て・指示の版 |
| `ai-review-provider.ts` | 接続先・モデル・必要な鍵の検証、共通の完了型と通信エラー |
| `ai-review-anthropic.ts` | Anthropic の要求・キャッシュ形式への変換と通信 |
| `ai-review-openai.ts` | OpenAI Responses API の要求への変換と通信 |
| `ai-review-completion.ts` | アダプターの選択、正常終了・JSON の検証、再試行の可否 |
| `ai-review-judgement.ts` | 根拠の検証・解答漏えいの検査・しきい値による判定。入出力だけで完結する |
| `ai-review.ts` | 上記の処理の呼び出し、結果の保存、提出への適用と競合の制御 |
| `ai-review-queue.ts` | リース、呼び出し回数、待ち時間、再試行 |

API 固有のフィールドはアダプターが付ける。共通の入力はキャッシュ位置の印だけを持ち、Anthropic の `cache_control` を OpenAI へ送らない。指示と教材の本文・順番は両方で共通にする。

## 設定

| 設定 | Anthropic | OpenAI |
| --- | --- | --- |
| `AI_REVIEW_PROVIDER` | `anthropic`（未設定時も同じ） | `openai` |
| `AI_REVIEW_MODEL` | 未設定なら `ANTHROPIC_MODEL` → 既存の既定モデル | 必須。Responses API の Structured Outputs に対応するモデル ID を指定 |
| Secret | `ANTHROPIC_API_KEY` | `OPENAI_API_KEY` |
| 通信先 | 既存の Cloudflare AI Gateway、または直接 | `https://api.openai.com/v1/responses` に直接 |

モデルは少数の提出で評価してから指定する。OpenAI の既定モデルは置かず、設定の省略で意図しないモデルを使わない。未知の接続先・モデル未指定・必要な鍵の欠落は「判定できない」とする。別の接続先への自動切り替えは行わない。

ローカルの設定先は `apps/api/.dev.vars`（例は `.dev.vars.example`）。本番は次の順で設定する。

1. クレジットの付与先の OpenAI API 組織でプロジェクトキーを作り、GitHub の Repository secret `OPENAI_API_KEY` に登録する。キーを Git やチャットへ貼り付けない。
2. `apps/api/wrangler.toml` の `[vars]` に `AI_REVIEW_PROVIDER = "openai"` と、評価した `AI_REVIEW_MODEL` を書く。
3. `main` へ push する。GitHub Actions が選んだ接続先の設定と鍵をリモート処理前に検査し、キーを Worker Secret に同期してからデプロイする。`/api/healthz` の `aiReviewConfigured` も選択した接続先で確かめる。

`OPENAI_API_KEY` は OpenAI を選んだ場合に必要で、既存の Anthropic 設定のデプロイでは任意。`ANTHROPIC_API_KEY` は引き続き既存のチャット・旧形式の下書き・育成メモにも使うため、デプロイの必須キーとして残す。一次レビュー以外の接続先はこの設定では変わらない。

## クレジットと失敗時の扱い

ChatGPT のサブスクリプションによる API クレジットは、対象の OpenAI API 組織へ請求する通常の API キーで使う。STELLA が ChatGPT のログイン情報を受け取ったり、特典の残高・付与周期を管理したりする仕組みは設けない。特典の有無にかかわらず同じ API を使い、請求と支出上限は OpenAI 側で管理する。利用資格・継続条件・期限は [OpenAI の公式案内](https://developers.openai.com/api/docs/guides/chatgpt-api-credits) を確認する。

OpenAI は `store: false` と厳密な JSON Schema を指定する。これは API での応答保存を無効にする設定で、提供元のすべてのデータ保持を無くすという意味ではない。[Responses API の案内](https://developers.openai.com/api/docs/guides/migrate-to-responses) と [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) に従う。

1 回の出力上限は両方とも 16,000 トークン。SDK の自動再試行を切り、再試行は既存の待ち行列だけが行う。時間切れ・接続失敗・一時的な 429・5xx は待ち行列が再試行し、拒否・打ち切り・スキーマ違反・認証不備・残高不足（`insufficient_quota` / `credit_balance_exhausted`）は講師へ回す。OpenAI のエラー本文は記録へ持ち込まない。

結果には接続先、実際のモデル、トークン数、指示としきい値の版を残す。migration `0069` より前の接続先は不明のまま残し、モデル名から推測して埋めない。評価用の集計も接続先ごとに分ける。

## 切り替え前の比較

`ai-review:compare` は人が判定した過去の提出を読み、本番と同じ通信・入力・判定で評価する。D1 と R2 は読み取り専用で開く。本番の合否・進捗・待ち行列へは書かない。

```powershell
# API を呼ばずに、入力の準備と対象件数を確認（モデル ID は評価対象に置き換える）
bun run --filter=@stella/api ai-review:compare -- --remote --provider openai --model MODEL_ID --limit 5

# API キーは環境変数 OPENAI_API_KEY から読む。実際に呼ぶときは --run と --limit が必須
bun run --filter=@stella/api ai-review:compare -- --remote --provider openai --model MODEL_ID --limit 5 --run
```

1 回の比較は最大 50 件で、直列に 1 回ずつ呼ぶ。結果は Git 対象外の `apps/api/.ai-review-compare/<日時>/report.json` と `report.md` に置く。提出本文・氏名・メールは結果へ残さない。API に渡す素材も本番と同じである。

既存の `ai-review:eval` は本番に残った結果を接続先・モデル・指示・しきい値ごとに集計する。既存の `ai-review:replay` は Anthropic Message Batches 専用として残し、OpenAI の比較には `ai-review:compare` を使う。
