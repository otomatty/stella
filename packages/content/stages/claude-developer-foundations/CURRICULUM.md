# Claude Certified Developer – Foundations 対策

Claude を初めて使うところから、開発者向け資格 CCDV-F の受験までを扱います。「STELLAの使い方」を修了した受講者に、基礎・一問一答・模擬試験の3ステージを順に割り当てます。目安は合計57時間です。演習用の原文、回答例、テストデータが付いているので、有料の契約やAPIキーは不要です。

## 試験の形式と公式の準備講座

この講座は2026年12月7日適用の CCDV-F 試験ガイド Version 1.1 に沿っています。本番では実務場面に基づく70問を120分で解きます。採点対象は60問で、採点対象外の10問は受験中には区別できません。合格点は100〜1,000の尺度で720点です。[公式試験ガイド（日本語PDF）](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946795/Claude_Certified_Developer_-_Foundations_Exam_Guide_Updated_Dec_7_Japanese.pdf)

Partner Academy の公式準備講座は全5部です。モデルの基礎は M1・M3、プロンプト・ツール・エージェントの実装は M4〜M6、Claude Code と MCP の統合は M5・M8、本番運用・評価・安全性は M2・M7・M8 に対応します。最後の部で扱う成果物の再利用と引き継ぎは、M10 の実行記録を使って説明する練習につなげます。[Developer – Foundations の公式準備講座](https://anthropic-partners.skilljar.com/path/claude-certified-developer-foundations)

## 3ステージの順序

| ステージ | 目安 | 学ぶことと次に進む目安 |
| --- | ---: | --- |
| [Claude の基礎と API 開発](./stage.json) | 52時間 | 最初に研修案内を読み、Claude への依頼を書き、回答中の日時と持ち物が原文にあるかを調べます。その後、API・ツール・エージェントへ進み、20件のコード課題で実行結果を確かめます。 |
| [Claude Developer 実務一問一答](../claude-developer-practice/stage.json) | 2時間 | 8領域を各3問、1問ずつ解きます。回答のたびに採点し、条件を一つ変えたら判断も変わるかを解説で確かめます。 |
| [Claude Developer 模擬試験](../claude-developer-mock-exam/stage.json) | 3時間 | 分野名の付いた予備演習で弱点を確認してから、初見の70問を120分で通して解きます。採点後は誤答に加え、根拠を説明できなかった正答も復習します。 |

## 領域から練習を選ぶ

配点は試験ガイドが示す各領域の割合の目安です。「できた証拠」は STELLA の課題と模試で確かめるために設けた目安です。

| 領域 | 配点 | 戻る単元と、できた証拠 |
| --- | ---: | --- |
| D1 エージェントとワークフロー | 17% | M6・M10。実行記録から止める条件を特定し、固定手順・動的な分岐・人の承認の担当を決める |
| D2 アプリへの組み込み | 20% | M1・M2・M8。入力、モデルとプロンプトの版、終了理由、画面表示をたどり、失敗した層に修正を入れる |
| D3 Claude Code | 8% | M8。共有設定、個人設定、組織の制約を区別し、繰り返す手順の置き場所と配り方を選ぶ |
| D4 評価・テスト・デバッグ | 10% | M8。人が付けた正解と採点器の判定を照合し、公開を止めるべき誤合格をケース ID で示す |
| D5 モデル選択と最適化 | 12% | M3。品質・遅延・費用を同じ評価セットで比較し、条件を一つ変えて採用候補を選び直す |
| D6 プロンプトとコンテキスト | 15% | M4・M7。回答の根拠を資料までたどり、情報がない場合と出力が壊れた場合を別々に処理する |
| D7 セキュリティと安全性 | 8% | M7・M10。入力・鍵・実行権限の境界を確かめ、許可されない呼び出しで副作用が起きないことを示す |
| D8 ツールと MCP | 10% | M5・M10。ツール呼び出しと結果を ID で対応づけ、共有する機能に合う接続方法を選ぶ |

## 進め方と受験前の確認

| 段階 | 単元と目安 | 受講者が残すもの |
| --- | --- | --- |
| 計画 | M0（2時間） | 入口のケースで説明に詰まった領域を記録し、配点と照らして復習時間を決める |
| API とモデル | M1（5時間）、M2（6時間）、M3（5時間） | 応答の履歴、失敗したリクエストの扱い、採用モデルを変える条件 |
| プロンプトと実行 | M4（4時間）、M5（4時間）、M6（9時間）、M7（3時間） | 入力の根拠、ツール結果、ループが終了した理由、許可範囲を確認できるテスト |
| 運用と評価・診断 | M8（12時間） | 設定の共有範囲、権限判定で止まる条件、失敗の原因と修正箇所、変更前後の評価 |
| 基礎の総合演習 | M10（2時間） | 確認Aの実行結果と、失敗が混じった問い合わせをどう扱ったかの説明 |
| 一問一答 | 第2ステージ（2時間） | 各領域の3問で判断を分けた条件 |
| 模擬試験 | 第3ステージ（3時間） | 予備演習、120分の初見結果、誤答の根拠と次に戻る領域 |

本講座の目安は、模擬試験の初見で8割（56/70）に届き、誤答と根拠が曖昧だった正答を別の条件で説明し直せることです。点数が届いても単一領域の誤答が続けば、その領域の課題へ戻ります。確認Aでは、手元のテストと提出時の説明で実装を確かめます。知識問題は Web、コード課題は VS Code の「課題を確認する」から開きます。

## takeaway 一覧

基礎ステージの単元は M0〜M8 と総合演習（M10）です。配布済みの教材・課題を同じIDで参照できるよう、既存の番号を使います。
takeaway は公式ドキュメントの見出しの範囲で確かめてから確定しました。試験ガイドが改訂されたら、試験時間と問題数、領域と課題の対応、模試の順に見直します。

### M0 Claude の基礎と学習の進め方

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 0-0-1 | `l0-first-conversation/t1-first-request` | Claude に初めて頼む | 使う資料と作ってほしいものを一緒に伝えます。 | Claude, チャット | — |
| 0-0-2 | `l0-first-conversation/t2-check-answer` | 回答を原文で確かめる | 答えに含まれる事実を原文と照らし、根拠が見つからない項目を区別します。 | 原文との照合 | Claude |
| 0-0-3 | `l0-first-conversation/t3-choose-interface` | ウェブで試した依頼をアプリから送る | 手作業で試した依頼は、Claude API を通じて自分のアプリから送れます。 | Claude API | Claude, チャット |
| 0-1-1 | `l1-exam-overview/t1-developer-cert` | Developer 資格が測るもの | Developer: Foundations は、Claude でアプリを作るエンジニアの資格です。 | 認定試験, Developer資格, ツール使用, エージェント | Claude API |
| 0-1-2 | `l1-exam-overview/t2-who-can-take` | 受験できる人 | 受験できるのは、Claude Partner Network に加盟した組織の人です。 | Claude Partner Network, Partner Academy | 認定試験 |
| 0-1-3 | `l1-exam-overview/t3-proctored-exam` | 監督つきの試験 | 試験は監督つきで行われ、始める前に本人確認があります。 | 監督つき試験, 本人確認, デジタルバッジ | 認定試験 |
| 0-2-1 | `l2-official-sources/t1-exam-guide` | 範囲は試験ガイドで確かめる | 出題の範囲と配点は、Partner Academy の試験ガイドで確かめます。 | 試験ガイド, 出題範囲, 配点 | 認定試験, Partner Academy |
| 0-2-2 | `l2-official-sources/t2-platform-docs` | API の仕様は公式ドキュメントで確かめる | API の動きは、公式ドキュメントの該当ページで確かめます。 | 公式ドキュメント, Messages API | Claude API |
| 0-2-3 | `l2-official-sources/t3-code-docs` | Agent SDK の仕様は Claude Code のドキュメントにある | Agent SDK の仕様は、Claude Code のドキュメントで確かめます。 | Agent SDK, Claude Code | 公式ドキュメント, エージェント |
| 0-2-4 | `l2-official-sources/t4-no-leaked-questions` | 本番の問題を写した教材は使わない | 本番の問題を写したとされる問題集は、学習に使いません。 | 非公式の問題集 | 試験ガイド |

### M1 Messages API の基本(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 1-1-1 | `l1-request-response/t1-send-history` | 会話は毎回まとめて送る | Messages API は会話を覚えないので、それまでのやり取りを messages の配列で毎回送ります。 | リクエスト, 応答, messages, role, 会話の履歴 | Messages API |
| 1-1-2 | `l1-request-response/t2-system` | 前提は system に書く | 最初から効かせる役割や前提は、messages ではなく system に書きます。 | system | messages, リクエスト |
| 1-1-3 | `l1-request-response/t3-max-tokens` | 出力の上限を決める | max_tokens は出力の上限で、届くと応答はそこで止まります。 | max_tokens, トークン | リクエスト, 応答 |
| 1-1-4 | `l1-request-response/t4-content-blocks` | 応答はブロックの配列 | 応答の content は、type で形の決まるブロックの配列です。 | content, コンテンツブロック, type | 応答 |
| 1-2-1 | `l2-sdk/t1-official-sdk` | SDK で呼ぶ | API は公式の SDK から呼び、一時的なエラーの送り直しを SDK に任せます。 | SDK, 送り直し | Claude API, リクエスト |
| 1-2-2 | `l2-sdk/t2-api-key` | API キーをコードに書かない | API キーはコードに書かず、環境変数 ANTHROPIC_API_KEY から SDK に読ませます。 | API キー, 環境変数, ANTHROPIC_API_KEY | SDK |
| 1-2-3 | `l2-sdk/t3-model-id` | モデルを ID で指す | モデル ID は決まったスナップショットを指し、新しい版は別の ID で出ます。 | モデル ID, スナップショット | リクエスト |
| 1-3-1 | `l3-stop-reasons/t1-branch-by-stop-reason` | 止まった理由で分ける | 応答の処理は、stop_reason の値ごとに分けます。 | stop_reason, end_turn | 応答 |
| 1-3-2 | `l3-stop-reasons/t2-max-tokens-stop` | 上限で切れた応答 | stop_reason が max_tokens の応答は、途中で切れています。 | 途中で切れた応答 | stop_reason, max_tokens |
| 1-3-3 | `l3-stop-reasons/t3-refusal` | 拒否された応答 | stop_reason が refusal の応答は、エラーではなく拒否として扱います。 | refusal, 拒否 | stop_reason |

### M2 アプリに組み込む(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 2-1-1 | `l1-errors/t1-retryable-errors` | 送り直せるエラー | 429 と 529 は、時間を置いて送り直すと通ることがあるエラーです。 | HTTP ステータス, 429, 529 | 送り直し, リクエスト |
| 2-1-2 | `l1-errors/t2-backoff` | 送り直しの間隔 | 送り直しは、間隔を広げながら回数の上限を決めて行います。 | 指数バックオフ, retry-after | 429, 529, SDK |
| 2-1-3 | `l1-errors/t3-request-id` | request ID を控える | 調査と問い合わせのために、応答の request ID を記録します。 | request ID | 応答, SDK |
| 2-1-4 | `l1-errors/t4-rate-limit-headers` | 制限の残りを見る | 応答のヘッダーで、レート制限の残りを確かめます。 | レート制限, レスポンスヘッダー | 429, 応答 |
| 2-2-1 | `l2-streaming/t1-show-as-it-arrives` | 届いた順に表示する | 長い応答は、ストリーミングで届いた順に表示します。 | ストリーミング | 応答, max_tokens, SDK |
| 2-2-2 | `l2-streaming/t2-delta-events` | 差分のイベント | ストリーミングでは、本文が差分のイベントとして順に届きます。 | イベント, text_delta, message_delta | ストリーミング, stop_reason, コンテンツブロック |
| 2-2-3 | `l2-streaming/t3-final-message` | まとめた応答を受け取る | イベントを1つずつ扱わなくても、SDK で最後にまとめた応答を受け取れます。 | finalMessage | イベント, SDK |
| 2-3-1 | `l3-batches/t1-batch-when` | 急がない大量の処理 | 急がない大量の処理は、Message Batches API にまとめて送ります。 | Message Batches API, バッチ, custom_id | リクエスト, Messages API |
| 2-3-2 | `l3-batches/t2-batch-price` | バッチの料金 | Message Batches API の料金は、通常の半額です。 | バッチの料金 | Message Batches API |
| 2-3-3 | `l3-batches/t3-batch-results` | バッチの結果を受け取る | バッチの結果は、すべて終わるか 24 時間たつと受け取れます。 | バッチの結果 | バッチ, custom_id |
| 2-4-1 | `l4-files-and-media/t1-files-api` | 何度も使うファイル | 何度も使うファイルは、Files API に上げて ID で指します。 | Files API, file_id | コンテンツブロック, リクエスト |
| 2-4-2 | `l4-files-and-media/t2-images-and-pdf` | 画像と PDF を渡す | 画像と PDF は、content のブロックとして渡します。 | image ブロック, document ブロック | content, file_id |

### M3 モデルの選択と費用・速度の調整(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 3-1-1 | `l1-choose-model/t1-criteria` | 選ぶ基準を先に決める | モデルは、性能・速度・費用のどれを優先するかを決めてから選びます。 | モデルの選択, 性能, 速度, 費用 | モデル ID |
| 3-1-2 | `l1-choose-model/t2-evaluate` | 自分の課題で比べる | 候補のモデルは、自分の課題で作った評価のセットで比べます。 | 評価, 評価のセット | モデルの選択, 性能, 費用 |
| 3-1-3 | `l1-choose-model/t3-effort` | かける量を決める | effort で、1 つのモデルが応答にかけるトークンの量を調整します。 | effort, output_config | モデルの選択, トークン, 評価 |
| 3-1-4 | `l1-choose-model/t4-combine` | モデルを組み合わせる | モデルの組み合わせは、1 つのモデルの effort を調整しても足りないときに考えます。 | モデルの組み合わせ, アドバイザー, オーケストレーター | effort, 評価, 費用 |
| 3-2-1 | `l2-prompt-caching/t1-reuse-prefix` | 同じ前半を使い回す | 毎回同じ前半のプロンプトは、プロンプトキャッシュで使い回します。 | プロンプトキャッシュ, cache_control, キャッシュの書き込み, キャッシュの読み込み | リクエスト, system, トークン, 費用 |
| 3-2-2 | `l2-prompt-caching/t2-stable-first` | 変わる部分は後ろに置く | キャッシュは前から一致した部分に効くので、変わる部分は後ろに置きます。 | キャッシュの区切り | プロンプトキャッシュ, cache_control, messages |
| 3-2-3 | `l2-prompt-caching/t3-check-usage` | キャッシュの効きを確かめる | キャッシュが効いたかは、応答の usage の値で確かめます。 | usage, cache_read_input_tokens, cache_creation_input_tokens, input_tokens | プロンプトキャッシュ, 応答, キャッシュの区切り |
| 3-3-1 | `l3-tokens-and-speed/t1-count-tokens` | 送る前に量を数える | 入力のトークン数は、送る前にトークン数を数える API で確かめます。 | トークン数を数える API, countTokens | トークン, リクエスト, SDK, 費用 |
| 3-3-2 | `l3-tokens-and-speed/t2-thinking-limit` | 考える過程も出力に数える | 考える過程のトークンも出力に数えるので、出力の上限は max_tokens で決めます。 | 考える過程, thinking ブロック | effort, max_tokens, コンテンツブロック, 途中で切れた応答 |
| 3-3-3 | `l3-tokens-and-speed/t3-latency` | 応答を速くする | 応答を速くするには、モデル・トークンの量・ストリーミングの 3 つを見直します。 | 遅延, 最初のトークンまでの時間 | 速度, ストリーミング, effort, max_tokens |

書く前の一覧(9 トピック)から、公式ドキュメントに合わせて次を変えました。effort をモデル選びのレッスンへ移し、
組み合わせは「1 つのモデルの effort を調整してから考える」順番として書きました(Optimizing for cost and intelligence の Combine models)。
キャッシュの効きを usage で確かめるトピックを足しました。「考えさせる」は、Claude 5 以降は考える過程が既定で使われるため、
考えた分が max_tokens に数えることと effort・max_tokens の使い分けに書き直しました。「速さが要るとき」は、
公式の 3 つの見直し(モデル・トークンの量・ストリーミング)を 1 つの takeaway にしました。

### M4 プロンプトとコンテキストの設計(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 4-1-1 | `l1-prompting/t1-be-specific` | 具体的に頼む | やってほしいことは、理由を添えて具体的に書きます。 | プロンプト, 指示 | system, messages |
| 4-1-2 | `l1-prompting/t2-examples` | 例で形を伝える | 期待する出力の形は、実際の用途に近く種類の違う例を 3〜5 個示します。 | 例, few-shot | プロンプト, 指示 |
| 4-1-3 | `l1-prompting/t3-xml-tags` | タグで区切る | 指示・資料・例は、それぞれ XML のタグで包んで区切ります。 | XML タグ | 指示, 例 |
| 4-1-4 | `l1-prompting/t4-long-documents` | 長い資料は先に置く | 長い資料はプロンプトの先頭に置き、質問は最後に書きます。 | 長い資料 | XML タグ, 指示 |
| 4-2-1 | `l2-output-format/t1-structured-outputs` | 決まった形の JSON | 決まった形の JSON が要るときは、構造化出力でスキーマを渡します。 | 構造化出力, JSON スキーマ | output_config, コンテンツブロック, 指示 |
| 4-2-2 | `l2-output-format/t2-check-before-parse` | 止まった理由を先に見る | 構造化出力の応答は、stop_reason を確かめてから JSON として読みます。 | スキーマに合わない出力 | 構造化出力, stop_reason, refusal, 途中で切れた応答 |
| 4-2-3 | `l2-output-format/t3-say-what-to-do` | してほしい形で頼む | 出力の書き方は、禁止ではなく、してほしい形で指示します。 | 出力の書き方 | 指示, XML タグ |
| 4-3-1 | `l3-context/t1-context-window` | 枠に収める | 入力と出力は、合わせてコンテキストウィンドウに収めます。 | コンテキストウィンドウ, model_context_window_exceeded | system, messages, max_tokens, stop_reason |
| 4-3-2 | `l3-context/t2-high-signal` | 効く情報だけを入れる | コンテキストには、結果に効く情報だけを、できるだけ少なく入れます。 | コンテキスト, コンテキストの劣化 | コンテキストウィンドウ, トークン |
| 4-3-3 | `l3-context/t3-compaction` | 長い会話を縮める | 長い会話は、圧縮で古いやり取りを要約に置き換えて続けます。 | 圧縮, コンテキストの編集 | コンテキストウィンドウ, 会話の履歴, コンテキストの劣化 |

書く前の一覧(8 トピック)から、公式ドキュメントに合わせて次を変えました。長い資料の並べ方(Prompting best practices の
Long context prompting)を足しました。「ツールの入力を守らせる(strict)」は、ツールの定義(`input_schema`・`tool_use`)を
習う前だと読めないので、M5 へ移しました。その代わりに、構造化出力でも `refusal`・`max_tokens` の応答はスキーマどおりとは
限らないこと(Important considerations の Invalid outputs)と、出力の書き方の指示(Output and formatting の
Control the format of responses)を足しました。prefill が Claude 4.6 以降で使えないことは、4-2-1 のまとめに書きました。

### M5 ツール使用と MCP(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 5-1-1 | `l1-tool-loop/t1-app-runs-tools` | ツールを実行するのはアプリ | 自分で定義したツールは、Claude が呼び出しを求め、アプリが実行します。 | ツール, tools, input_schema, tool_use | ツール使用, stop_reason, リクエスト, JSON スキーマ |
| 5-1-2 | `l1-tool-loop/t2-return-results` | 結果を返す | ツールの結果は tool_result にして、次のリクエストの user の発言で返します。 | tool_result, tool_use_id, ツール使用のループ | tool_use, 会話の履歴, end_turn |
| 5-1-3 | `l1-tool-loop/t3-return-errors` | 失敗を返す | ツールが失敗したら、is_error を付けた結果で、何が起きたかを返します。 | is_error | tool_result, ツール使用のループ |
| 5-1-4 | `l1-tool-loop/t4-server-tools` | Anthropic 側で動くツール | サーバーツールは Anthropic の側で実行され、アプリが結果を返す処理は要りません。 | サーバーツール, クライアントツール | ツール, tool_result |
| 5-2-1 | `l2-tool-design/t1-description` | 説明に書くこと | ツールの説明には、何をし、いつ使い、何を返すかを詳しく書きます。 | ツールの説明 | ツール, input_schema |
| 5-2-2 | `l2-tool-design/t2-tool-choice` | ツールを使う場面を決める | ツールを使うかどうかは、tool_choice と system の指示で調整します。 | tool_choice | ツール, system |
| 5-2-3 | `l2-tool-design/t3-strict` | ツールの入力を守らせる | ツールの入力をスキーマどおりにさせるには、strict: true を指定します。 | strict | input_schema, tool_use, JSON スキーマ |
| 5-2-4 | `l2-tool-design/t4-fewer-tools` | ツールは少数にまとめる | 似たツールを並べず、目的ごとに少数のツールにまとめます。 | ツールの名前空間 | ツール, ツールの説明, コンテキスト |
| 5-3-1 | `l3-mcp/t1-what-is-mcp` | 共通の約束でつなぐ | MCP は、ツールやデータを AI のアプリにつなぐための、公開された共通の規格です。 | MCP, MCP サーバー | ツール |
| 5-3-2 | `l3-mcp/t2-mcp-connector` | API から MCP を使う | MCP コネクターを使うと、Messages API からリモートの MCP サーバーのツールを使えます。 | MCP コネクター, mcp_servers, mcp_toolset | MCP サーバー, Messages API, tools |
| 5-3-3 | `l3-mcp/t3-sdk-mcp` | SDK から MCP を使う | Agent SDK では、MCP サーバーを設定に足し、使うツールを allowedTools で許可します。 | mcpServers, allowedTools | Agent SDK, MCP サーバー |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。「ツールを使わせる」(tool_choice で必ず使わせる)は、
Claude Opus 5.5・Claude Sonnet 5.5・Claude Fable 5.1 で `any`・`tool` が 400 エラーになる(Define tools の Forcing tool use)ため、
「ツールを使う場面を決める」(tool_choice と system の指示で調整する)に書き直しました。「Anthropic 側で動くツール」には、
結果を返す処理が要らないことまでを takeaway に入れました。「SDK から MCP を使う」には、MCP のツールは許可するまで使えないこと
(Allow MCP tools)を入れました。MCP の仕様のサイトは執筆環境から届かないため、MCP の説明は Anthropic と Claude Code の
ドキュメントに書かれた範囲にとどめました。

### M6 ワークフローとエージェント(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 6-1-1 | `l1-agentic-systems/t1-who-decides` | 手順を決めるのは誰か | 手順をコードで決める仕組みがワークフローで、手順を Claude に任せる仕組みがエージェントです。 | ワークフロー | エージェント, ツール |
| 6-1-2 | `l1-agentic-systems/t2-start-simple` | 単純な作りから始める | まず単純な作りで試し、効果が確かめられたときだけ複雑にします。 | フレームワーク | ワークフロー, 評価 |
| 6-2-1 | `l2-workflows/t1-chaining` | 段に分けてつなぐ | 大きな処理は、確かめやすい段に分けて順につなぎ、段の間で結果を確かめます。 | プロンプトの連鎖, ゲート | ワークフロー |
| 6-2-2 | `l2-workflows/t2-routing` | 入力で振り分ける | 入力の種類で、扱う指示やモデルを振り分けます。 | ルーティング | ワークフロー, モデルの選択 |
| 6-2-3 | `l2-workflows/t3-parallel` | 並べて同時に処理する | 互いに独立した部分は、並べて同時に処理します。 | 並列化, 分割, 投票 | ワークフロー |
| 6-2-4 | `l2-workflows/t4-orchestrator` | 指揮役が仕事を配る | 分け方が前もって決まらない仕事は、指揮役が分けて配ります。 | 作業役 | オーケストレーター, 並列化 |
| 6-2-5 | `l2-workflows/t5-evaluator` | 評価役に直させる | 評価の基準がはっきりした仕事は、評価役の指摘で直させます。 | 評価役, 生成役 | ワークフロー, 評価 |
| 6-3-1 | `l3-agent-sdk/t1-agent-loop` | エージェントのループ | Agent SDK は、ツールの実行と結果の受け渡しを繰り返すループを持っています。 | query, ResultMessage | Agent SDK, ツール使用のループ |
| 6-3-2 | `l3-agent-sdk/t2-subagents` | サブエージェントに渡す | サブエージェントは自分の会話で動くので、要る情報をプロンプトに書いて渡します。 | サブエージェント | query, コンテキスト |
| 6-3-3 | `l3-agent-sdk/t3-sessions` | 作業を再開する | 続きの作業は、セッションの ID を控えておき、resume で再開します。 | セッション, resume | query, ResultMessage |
| 6-4-1 | `l4-runtime-and-limits/t1-stop-conditions` | 止まる条件を決める | エージェントには最大ターン数と予算の上限を決め、結果の種別を見てから結果を使います。 | maxTurns, maxBudgetUsd, subtype | Agent SDK, ResultMessage, 費用 |
| 6-4-2 | `l4-runtime-and-limits/t2-choose-runtime` | 動かす場所を選ぶ | 自分で運用するなら Agent SDK、長時間の作業を任せるなら Managed Agents を選びます。 | Managed Agents, サンドボックス | Agent SDK, Messages API, セッション, イベント |
| 6-4-3 | `l4-runtime-and-limits/t3-fixed-steps-for-audit` | 監査が要るなら手順を固定する | 監査や誤りの許容度が厳しい業務は、手順を固定したワークフローにします。 | 監査 | ワークフロー, エージェント, 並列化 |
| 6-5-1 | `l5-long-running/t1-prune-tool-results` | 古いツール結果を減らす | 古いツール結果が溜まったら、コンテキストの編集で古い結果から外します。 | ツール検索 | コンテキストの編集, 圧縮, プロンプトキャッシュ, tools |
| 6-5-2 | `l5-long-running/t2-isolate-research` | 調べものを切り離す | 文脈を埋める調べものはサブエージェントに任せ、親は要約だけを受け取ります。 | — | サブエージェント, コンテキスト, 並列化 |
| 6-5-3 | `l5-long-running/t3-start-fresh` | 新しく始める基準 | 2 回直しても直らないときと、関係のない作業に移るときは、新しいセッションで始めます。 | — | セッション, resume, 圧縮 |
| 6-5-4 | `l5-long-running/t4-persist-memory` | セッションをまたいで覚える | セッションをまたいで要る情報は、ファイルやメモリーに書き出します。 | メモリーツール, メモリーストア | セッション, コンテキストの編集, resume |
| 6-6-1 | `l6-diagnose/t1-read-the-trace` | トレースで原因を探す | エージェントの不具合は、実行の記録を順に読み、どの設計が欠けているかで分けます。 | トレース | tool_use, tool_result, stop_reason, コンテキスト |
| 6-6-2 | `l6-diagnose/t2-endless-loop` | 終わらないループ | 終わらないループには、止まる条件と回数の上限を足します。 | — | ツール使用のループ, stop_reason, is_error, maxTurns, maxBudgetUsd |
| 6-6-3 | `l6-diagnose/t3-paused-turn` | 途中で返ってきた応答 | stop_reason が pause_turn の応答は、内容を変えずに送り直して続きを受け取ります。 | pause_turn | stop_reason, サーバーツール, messages, content, tools |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。「段に分けてつなぐ」には、段の間のゲート(Building effective agents の
Prompt chaining)を takeaway に入れました。「サブエージェントに渡す」は、親から渡るのが呼び出すときのプロンプトだけ(What subagents
inherit)なので、「プロンプトに書いて渡す」と具体にしました。「作業を再開する」は、ResultMessage の session_id を控えて resume に
渡す(Work with sessions)と具体にしました。オーケストレーターは M3 で導入した語を使い、6-2-4 では作業役を足しました。
Building effective agents は 2024 年 12 月の記事で、冒頭に道具の状況が変わった注記があるため、本文では形と考え方だけを扱いました。

### M7 安全性とセキュリティ(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 7-1-1 | `l1-prompt-injection/t1-untrusted-as-data` | 外の文章は指示ではない | ツールで取った外の文章は、tool_result の中にデータとして入れて渡します。 | プロンプトインジェクション, 信頼できない内容 | tool_result, system |
| 7-1-2 | `l1-prompt-injection/t2-screen-inputs` | 危ない入力をふるい分ける | 危ない入力は、本処理の前に小さいモデルでふるい分けます。 | ふるい分け, ジェイルブレイク | 構造化出力, refusal, プロンプトインジェクション |
| 7-1-3 | `l1-prompt-injection/t3-least-privilege` | 権限を絞る | エージェントが使えるツールと権限は、作業に要るものだけに絞ります。 | 最小権限, permissionMode, disallowedTools | allowedTools, Agent SDK, プロンプトインジェクション |
| 7-2-1 | `l2-reliable-answers/t1-allow-unknown` | 分からないと言わせる | 分からないときは分からないと答えてよい、と指示に書きます。 | ハルシネーション | 指示 |
| 7-2-2 | `l2-reliable-answers/t2-quote-first` | 引用から答えさせる | 長い資料の事実は、先に引用を抜き出させてから答えさせます。 | 根拠の引用 | 長い資料, ハルシネーション |
| 7-2-3 | `l2-reliable-answers/t3-hide-secrets` | 秘密を見せない | API キーなどの秘密はエージェントに渡さず、外側のプロキシで付け足します。 | プロキシ | API キー, エージェント, 最小権限 |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。「外の文章は指示ではない」は、Mitigate jailbreaks and prompt
injections の Indirect prompt injection に合わせ、外の文章を tool_result の中に入れる(JSON にして包む)と具体にしました。タグで包む
だけでは、本文でタグを閉じて抜け出せるためです。「危ない入力をふるい分ける」には小さいモデルを使うことを入れました。「権限を絞る」は
ツールだけでなく権限のモードも絞る(allowedTools はほかのツールを消さない)と書きました。「秘密を残さない」は、プロンプトとログの扱いに
ついての公式の節が見つからなかったため、Securely deploying AI agents の Credential management に合わせて「秘密を見せない」
(外側のプロキシで付け足す)にしました。

### M8. Claude Code の運用と評価・診断(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 8-1-1 | `l1-claude-code/t1-claude-md` | 毎回効かせる約束 | 毎回効かせたいプロジェクトの約束は、CLAUDE.md に短く具体的に書きます。 | CLAUDE.md, 自動メモリー | Claude Code, 指示 |
| 8-1-2 | `l1-claude-code/t2-hooks` | 必ず実行する処理 | 必ず実行したい処理は、CLAUDE.md の指示ではなくフックで決めます。 | フック, PreToolUse, PostToolUse | CLAUDE.md |
| 8-1-3 | `l1-claude-code/t3-settings` | 共有する設定の置き場所 | チームで共有する設定は、プロジェクトの .claude/settings.json に置いてリポジトリに入れます。 | 設定ファイル, 管理された設定 | フック |
| 8-2-1 | `l2-evals/t1-success-criteria` | 成功の基準を先に決める | 作る前に、具体的で測れる成功の基準を決めます。 | 成功の基準 | 評価 |
| 8-2-2 | `l2-evals/t2-compare-evals` | 同じ評価で比べる | プロンプトを変えたら、同じ評価のセットを自動で採点して前と比べます。 | 採点, LLM による採点 | 評価のセット, 成功の基準 |
| 8-2-3 | `l2-evals/t3-tool-misuse` | ツールの誤用を直す | ツールの誤用は、ツールの説明・スキーマ・strict から直します。 | ツールの誤用 | ツールの説明, strict, input_schema |
| 8-2-4 | `l2-evals/t4-calibrate-judge` | 採点器の見逃しを調べる | 人の判定と採点器の判定を同じ回答で照合し、誤って通した回答を特定します。 | 誤合格, 校正用データ | LLM による採点, 評価のセット |
| 8-3-1 | `l3-instructions-and-permissions/t1-claude-md-layers` | CLAUDE.md は重ねて読まれる | 複数の場所にある CLAUDE.md は、広い範囲から順に重ねて読み込まれます。 | — | CLAUDE.md, 指示 |
| 8-3-2 | `l3-instructions-and-permissions/t2-path-rules` | ファイルで絞る約束 | 特定のファイルにだけ効かせたい約束は、パスを指定したルールファイルに書きます。 | ルールファイル, パス指定 | CLAUDE.md, 圧縮 |
| 8-3-3 | `l3-instructions-and-permissions/t3-deny-first` | 拒否が先に決まる | 権限のルールは拒否・確認・許可の順に判定され、拒否が最優先です。 | 権限のルール | 設定ファイル, 管理された設定 |
| 8-3-4 | `l3-instructions-and-permissions/t4-permission-modes` | 権限モードを選ぶ | 権限モードは、作業の危険度に合わせて選びます。 | 権限モード | permissionMode, 最小権限, 権限のルール, フック |
| 8-4-1 | `l4-run-and-sessions/t1-non-interactive` | 対話なしで実行する | スクリプトや CI からは -p で対話なしに実行し、許可するツールを指定します。 | 対話なしの実行, CI | 権限モード, allowedTools, disallowedTools, 最小権限, フック, MCP サーバー |
| 8-4-2 | `l4-run-and-sessions/t2-clear-or-resume` | 作業の区切りで会話を分ける | 関係のない作業に移るときは会話を消し、同じ作業の続きはセッションを再開します。 | チェックポイント | セッション, resume, 圧縮 |
| 8-4-3 | `l4-run-and-sessions/t3-where-config-reaches` | 設定が届く範囲 | リポジトリに入れた設定はチームと CI に届き、端末だけの設定はその端末に残ります。 | サーバーで管理する設定 | 設定ファイル, 管理された設定, CI, CLAUDE.md, MCP サーバー |
| 8-5-1 | `l5-extend/t1-skills` | 繰り返す手順を Skill にする | 繰り返し使う手順や知識は、Skill にして必要なときだけ読み込ませます。 | Skill | Claude Code, CLAUDE.md |
| 8-5-2 | `l5-extend/t2-choose-mechanism` | 仕組みを選ぶ | 常に効かせるなら CLAUDE.md、繰り返すなら Skill、必ず実行するならフックを選びます。 | — | CLAUDE.md, ルールファイル, Skill, フック, PreToolUse, PostToolUse, サブエージェント, MCP サーバー |
| 8-5-3 | `l5-extend/t3-plugins` | まとめて配る | 複数のリポジトリで使う設定は、プラグインにまとめ、依存の版の範囲を決めて配ります。 | プラグイン, マニフェスト, 依存の版の範囲 | Skill, フック |
| 8-6-1 | `l6-config-sdlc/t1-pin-model` | モデルを固定する | 再現性が要る実行では、別名ではなく完全なモデル ID で固定します。 | モデルの別名 | Claude Code, モデル ID, スナップショット, CI |
| 8-6-2 | `l6-config-sdlc/t2-ci-secrets` | CI で動かす | CI では、秘密の値をシークレットに置き、許可するツールを絞って実行します。 | シークレット | CI, 対話なしの実行, 最小権限, 権限モード, allowedTools, モデル ID |
| 8-6-3 | `l6-config-sdlc/t3-version-prompts` | プロンプトを版で管理する | プロンプトと設定はリポジトリで版を管理し、変えるたびに同じ評価を回します。 | プロンプトの版管理 | プロンプト, 設定ファイル, 評価のセット, モデル ID |
| 8-7-1 | `l7-agent-guardrails/t1-sdk-hooks` | SDK でもフックで止める | Agent SDK でも、必ず止めたい呼び出しは PreToolUse のフックで拒否します。 | ハーネス, matcher | Agent SDK, query, PreToolUse, PostToolUse, Skill |
| 8-7-2 | `l7-agent-guardrails/t2-decision-order` | 許可は順に判定される | ツールの許可は、フック・拒否・確認・権限モード・許可ルール・canUseTool の順に判定します。 | canUseTool | PreToolUse, 権限のルール, 権限モード, allowedTools |
| 8-7-3 | `l7-agent-guardrails/t3-hook-failure` | フックが失敗したとき | フックが失敗しても操作を止めるには、失敗時に遮断する設定を付けます。 | onFailure | PreToolUse, matcher |
| 8-8-1 | `l8-failure-modes/t1-which-layer` | どの層の失敗かを分ける | 失敗は、まず HTTP のエラーか、成功した応答の中身かで分けます。 | 障害モード | HTTP ステータス, stop_reason, 拒否, ハルシネーション |
| 8-8-2 | `l8-failure-modes/t2-under-acting` | 提案で終わってしまう | 実行してほしいときは、依頼に実行する操作を明記します。 | 行動不足 | プロンプト, 指示, ツール |
| 8-8-3 | `l8-failure-modes/t3-context-loss` | 前の指示を忘れる | 途中の指示が消えたら、圧縮や削除で外れていないかを履歴で確かめます。 | コンテキストの喪失 | 圧縮, コンテキストの編集, 会話の履歴, ハーネス |
| 8-8-4 | `l8-failure-modes/t4-format-drift` | 形が崩れてくる | 出力の形が崩れるなら、構造化出力で必要な形を指定します。 | フォーマットのドリフト | 構造化出力, JSON スキーマ, stop_reason |
| 8-8-5 | `l8-failure-modes/t5-fix-the-cause` | 原因のある場所を直す | 対策は、失敗の原因がある場所に合わせて選びます。 | トランスクリプト | 障害モード, 拒否, 評価のセット, 採点 |

書く前の一覧から、公式ドキュメントに合わせて次を具体にしました。CLAUDE.md は「短く具体的に」(How Claude remembers your project
の Write effective instructions)、設定は置き場所を `.claude/settings.json` と名指し(Settings files and precedence)、評価は
「自動で採点して」(Define success criteria and build evaluations の Grade your evaluations)、ツールの誤用は strict まで
(Troubleshooting tool use)を takeaway に入れました。フックは、CLAUDE.md が指示として読まれるだけで必ず守られる設定ではない
こと(CLAUDE.md vs auto memory)と対にして書きました。


### M10 基礎の総合演習

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 10-1-1 | `l1-api-distinctions/t1-stream-or-batch` | 待つ人がいるかで選ぶ | 人が応答を待つならストリーミング、急がない大量の処理ならバッチで送ります。 | — | ストリーミング, Message Batches API, バッチの料金, バッチの結果 |
| 10-1-2 | `l1-api-distinctions/t2-cache-and-batch` | 割引を重ねる | キャッシュとバッチの割引は重ねられますが、バッチの中のキャッシュは当たるとは限りません。 | — | プロンプトキャッシュ, cache_control, Message Batches API, バッチの料金 |
| 10-1-3 | `l1-api-distinctions/t3-format-or-strict` | スキーマをかける場所 | 応答の形は構造化出力で、ツールの入力の形は strict で決め、両方を同じリクエストで使えます。 | — | 構造化出力, output_config, strict, tool_use, JSON スキーマ |
| 10-1-4 | `l1-api-distinctions/t4-stop-reason-or-error` | エラーではない止まり方 | stop_reason は成功した応答が止まった理由で、HTTP のエラーとは分けて扱います。 | — | stop_reason, HTTP ステータス, refusal, 途中で切れた応答, 送り直し |
| 10-2-1 | `l2-agent-distinctions/t1-connector-or-sdk` | MCP をつなぐ場所 | 公開された MCP サーバーは MCP コネクターで API から使い、手元で動く stdio のサーバーは Agent SDK でつなぎます。 | — | MCP サーバー, MCP コネクター, mcp_servers, Agent SDK, mcpServers |
| 10-2-2 | `l2-agent-distinctions/t2-workflow-or-agent` | 手順を前もって書けるか | 手順を前もって書ける仕事はワークフローで、柔軟な判断が要る仕事はエージェントで作ります。 | — | ワークフロー, エージェント, プロンプトの連鎖, ルーティング |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。切り分けは、API の機能(10-1)とエージェントの作り(10-2)の
2 レッスンに分け、Stop reasons and fallback の Stop reasons versus errors に合わせて「stop_reason とエラー」(10-1-4)を足しました。
確認A で stop_reason の分岐とエラーの扱いを分けて書くためです。比べる 2 つの機能はどちらも導入済みなので、切り分けのトピックは
新しい語を導入しません(タイトルに「と」を入れず、選ぶ条件を題にしました)。「キャッシュとバッチ」は、Batch processing の
Using prompt caching with Message Batches に合わせ、バッチの中ではキャッシュが当たるとは限らないことまでを takeaway に入れました。
「構造化出力と strict」は、Structured outputs の Using both features together に合わせ、同じリクエストで両方を使えることを入れました。
### 実務一問一答と模擬試験

第2ステージは、1回の採点で1問の解説を開く24問です。第3ステージでは、場面の条件を拾う練習（10-4-1）、分野の手がかりがある別の24問（10-3-1）、分野を伏せた70問の模試（9-1-1）の順に取り組みます。模試の各問には、採点後に出題領域と復習先が表示されます。

## 手を動かす課題

M0〜M8 と M10 に、VS Code 拡張の「STELLA: 課題を確認する」で確かめる課題を置きます(runner は `node-test`、環境は `node-test-01`)。
ひな形は `templates/runners/node-test/` で、テスト(Vitest)・ESLint・Prettier を拡張と同じ固定の手順で動かします。

- **API キーなしで解ける形にする。** 受講者の関数は Claude のクライアントを引数で受け取り、テストは Messages API の応答の形
  (content のブロック・stop_reason・usage など)を返す偽のクライアントを渡す。偽のクライアントは `tests/` に置き、`protected` にする
- 応答の形は公式ドキュメント(Using the Messages API・Handle tool calls・Streaming messages など)の例に合わせ、課題文に出典を付ける
- 本物の API で試すのは任意の発展とし、課題文の末尾に書くだけにする(費用がかかるため完走条件にしない)
- 種別ごとのヒント・解答例の出し方は ADDING_STAGE.md の表に従う。基礎はヒント 2 段、自力はヒント 2 段 + 挑戦 5 回で解答例

| 単元 | 課題 | 種別 | 作るもの(テストが確かめること) |
| --- | --- | --- | --- |
| M0 | `q01-study-plan` 配点に合わせて学習時間を配る(**実装済み**) | 基礎 | 配点の合計に対する割合で時間を配り、0.5 時間単位に丸める |
| M1 | `q01-build-messages` 会話の履歴を組み立てる(**実装済み**) | 基礎 | これまでのやり取りと新しい発言から、system と messages を持つリクエストを作り(履歴の配列は書き換えない)、応答のテキストのブロックをつなぐ |
| M1 | `q02-route-stop-reason` 止まった理由で処理を分ける(**実装済み**) | 自力 | stop_reason ごとに、答え・途中で切れた応答・ツールの呼び出し・拒否(表示用の説明)を返し、表にない値は扱いを決めていない値として返す(説明欄あり) |
| M2 | `q01-retry-transient` 送り直せるエラーだけを送り直す(**実装済み**) | 自力 | 429・500・529 だけを、retry-after か倍になる間隔で、上限の回数まで送り直す(待ち時間の関数は引数で受け取る。説明欄あり) |
| M2 | `q02-collect-stream` ストリームから本文を組み立てる(**実装済み**) | 基礎 | イベントの列から text_delta の差分だけをつなぎ、message_delta の stop_reason を返す(知らないイベントは読み飛ばす) |
| M2 | `q03-batch-requests` バッチのリクエストを組み立てる(**実装済み**) | 基礎 | 問い合わせの一覧から custom_id の重ならないリクエストの束を作り、結果を custom_id で引く |
| M3 | `q01-cache-friendly-prompt` キャッシュが効く順に並べる(**実装済み**) | 基礎 | 変わらない指示と資料を system に、変わる時刻と質問を messages に置き、毎回同じ部分の最後のブロックにだけ cache_control を付ける。usage の 3 つの値から入力の合計と、読み込み・書き込み・キャッシュなしを返す |
| M3 | `q02-estimate-cost` 費用を見積もる(**実装済み**) | 自力 | usage の内訳と単価(引数、100 万トークンあたり)から費用を求め、キャッシュの有無(1 回目は書き込み・最低の長さ)とバッチの割引で比べる(説明欄あり) |
| M4 | `q01-tagged-prompt` 指示と資料を分ける(**実装済み**) | 基礎 | 資料・例・指示・質問を XML のタグで包み、資料を先頭・質問を最後に並べたプロンプトを作る。応答からタグの中身を取り出し、なければ null を返す |
| M4 | `q02-extraction-schema` 抽出のスキーマを書く(**実装済み**) | 自力 | メールの欠損値を表す構造化出力を作る。保存済みの応答を読み直し、不正な JSON、型の違い、デモ希望と希望日の矛盾を区別する。日程未定の希望を受け付ける例と、登録を止める例を提出する |
| M5 | `q01-tool-loop` ツール使用のループを回す(**実装済み**) | 自力 | 偽の送信の関数で、tool_use を実行して tool_use_id で結んだ tool_result を 1 つの user の発言で返し、end_turn か maxTurns まで繰り返す。知らないツールは is_error で返す(説明欄あり) |
| M5 | `q02-fix-tool-error` ツールの失敗で止まるのを直す(**実装済み**) | 修正 | 障害の報告とログから、ツールの例外と知らないツールで止まる不具合を、is_error を付けた結果を返す形に直す(修正記録あり。CR-DEBUG-01 は導入が javascript-basics でこのステージの前提にないため任意にし、同じ観点をルーブリックに書いた) |
| M5 | `q03-mcp-catalog` MCP で品目表と在庫検索を提供する | 自力 | 品目表を読むリソースと在庫を調べるツールを、公開する情報と権限の境界に沿って実装する |
| M6 | `q01-router` 入力で振り分ける(**実装済み**) | 自力 | 分類の結果の空白・大文字と小文字・末尾の句読点をそろえ、種類ごとのモデル・指示・上限で答えさせる。当てはまらない分類は fallback に回し fellBack で示す(説明欄あり) |
| M6 | `q02-chain-with-gate` 段に分けてつなぐ(**実装済み**) | 自力 | 段の出力をゲートで確かめ、条件を満たさないか例外なら次の段へ進まずに止まった段と理由を返す。retries の回数まで、ゲートの理由を feedback にしてやり直す(説明欄あり) |
| M7 | `q01-wrap-untrusted` 外の文章をデータとして渡す(**実装済み**) | 基礎 | ツールで取った内容を出どころと一緒に JSON にして tool_result に入れ(タグで包まない)、アプリの指示は tool_result のあとの text ブロックで渡す |
| M7 | `q02-least-privilege` 要るツールだけを許可する(**実装済み**) | 自力 | 作業の種類から allowedTools を最小にし(Bash は npm test だけ、MCP は名前で 1 つずつ)、dontAsk と、Bash の要らない作業では disallowedTools の Bash でほかを断る(説明欄あり) |
| M8 | `q01-eval-compare` 評価のセットで比べる(**実装済み**) | 自力 | 評価のケースをすべて回してコードで採点し合格率を出す(生成の失敗は不合格として残す)。同じセットの前後を比べ、合格率の差と、悪化したケース・直ったケースを返す(説明欄あり) |
| M8 | `q02-calibrate-judge` 採点器の見逃しを調べる | 自力 | 人と採点器の判定を突き合わせ、誤合格・誤不合格を ID で残し、受入基準で採用か再調整かを決める |
| M10 | `q01-support-assistant` 問い合わせに答えるアシスタント(**実装済み**) | 確認A | 複数の注文を照会し、成功・失敗が混じった結果と再照会の履歴をツール ID で追う。取り消しを実行させず、回答に不要な注文データを除く。拒否・応答の中断・SDK の再試行後の障害を区別し、提出時に実行記録を説明する |

M1〜M8 の課題は、リクエスト・応答・イベント・結果・usage・権限の設定・評価のケースの形をした値や、偽の送信・分類・段・生成の関数を扱う関数なので、クライアントは使いません。M10 の確認Aだけが `client.messages.create(本文, 設定)` の形のクライアントを受け取り、テストは SDK が送り直したあとの結果を返す偽のクライアント(`tests/fake-client.js`)を渡します。

確認Aの「送り直し」は、書く前の一覧では自分で送り直す処理を想定していましたが、M1(1-2-1)と M2(2-1-2)で「送り直しは SDK に任せ、足りるかを先に考える」と教えたので、リクエストごとに `maxRetries` を渡し、SDK が送り直したあとのエラーをアプリで重ねて送り直さない形にしました。ツール使用で thinking ブロックを返すこと(Thinking の Preserving thinking blocks)も、Claude 5 のモデルが考える過程を既定で使うため(3-3-2)、仕様に入れました。

## 試験ガイド v1.1 に合わせた追加(計画)

2026-12-07 適用の CCDV-F 試験ガイドに合わせて追加します。対応スキルの番号は分野とその中の順番です。

| 単元 | レッスン(ディレクトリ) | トピック(タイトル — takeaway) | 対応スキル | 状態 |
| --- | --- | --- | --- | --- |
| M8 | `l3-instructions-and-permissions` | 上の takeaway 一覧の 8-3-1〜8-3-4 | 3-1 | 済 |
| M8 | `l4-run-and-sessions` | 上の takeaway 一覧の 8-4-1〜8-4-3 | 3-1、2-3 | 済 |
| M8 | `l5-extend` | 上の takeaway 一覧の 8-5-1〜8-5-3 | 3-2、2-3 | 済 |
| M8 | `l6-config-sdlc` | 上の takeaway 一覧の 8-6-1〜8-6-3 | 2-3 | 済 |
| M8 | `l7-agent-guardrails` | 上の takeaway 一覧の 8-7-1〜8-7-3 | 1-2、7-2 | 済 |
| M8 | `l8-failure-modes` | 上の takeaway 一覧の 8-8-1〜8-8-5 | 4-2 | 済 |
| M2 | `l1-errors`(追加)、`l2-streaming`(追加) | 送り直さないエラー — 400 と 413 は送り直しても通らないので、リクエストを直します。<br>応答の終わりを見分ける — content_block_stop はブロックの終わりで、応答の終わりは message_stop です。<br>途中で届くエラー — ストリームの途中のエラーは error イベントで届くので、イベントの種類で分けます。 | 2-4 | 未着手 |
| M2 | `l5-app-boundary` | system は運用者の指示 — system は運用者の指示、user の発言は利用者の言葉として読まれ、食い違えば system が優先されます。<br>API にアプリの前提はない — claude.ai のアプリが持つ指示や機能は、API のリクエストには付きません。<br>履歴は足すだけにする — 会話の履歴は書き換えずに後ろへ足し、利用者ごとに保存場所を分けます。 | 2-2 | 未着手 |
| M3 | `l4-cost-diagnosis` | 変わる頻度で区切る — 変わる頻度の違う部分は、それぞれの終わりにキャッシュの区切りを置きます。<br>伸びる会話を追いかける — 伸びていく会話では、最後のブロックに区切りを置いて、前のターンまでを読み込みます。<br>外れた原因を探す — キャッシュが読まれないときは、区切りより前に毎回変わる値がないかを先に調べます。<br>いちばん大きい費用から直す — 使用量の内訳でいちばん大きい項目を見つけ、その項目に効く手段を選びます。 | 5-3 | 未着手 |
| M3 | `l5-release-planning` | 同じ入力でも出力は変わる — 同じ入力でも出力は毎回同じとは限らないので、複数回の結果で判断します。<br>モデルには終わりがある — モデルは予告のあとに廃止されるので、廃止日より前に次のモデルで評価します。<br>替える前に同じ評価を回す — モデルを替える前に、同じ評価のセットで品質・速度・費用を比べ直します。 | 5-1、5-2 | 未着手 |
| M5 | `l4-build-mcp-server` | サーバーが出す 3 つ — MCP サーバーは、ツール・リソース・プロンプトの 3 つを出します。<br>つなぎ方を選ぶ — 手元の 1 つのアプリ向けなら stdio、離れた場所から複数で使うなら HTTP でつなぎます。<br>離れたサーバーを守る — HTTP の MCP サーバーは、トークンをヘッダーで受け取り、自分あてのものかを確かめます。 | 8-2 | 未着手 |
| M5 | `l5-shape-and-select` | 結果を絞って返す — ツールの結果は、次の判断に要る項目だけに絞って返します。<br>次の一手が分かるエラー — ツールのエラーには、何が違い、どう直せばよいかを書きます。<br>実行前に承認を取る — 取り消せない操作のツールは、実行の前にアプリが人の承認を取ります。<br>知識は Skill、接続は MCP — 手順や知識を足すなら Skill、外のシステムにつなぐなら MCP を選びます。<br>置き場所と持ち主で選ぶ — 機能の出し方は、どこで動かし、誰が直し、Claude がどう見つけるかで選びます。 | 8-1、8-3 | 未着手 |
| M6 | `l4-runtime-and-limits` | 止まる条件を決める — エージェントには最大ターン数と予算の上限を決め、結果の種別を見てから結果を使います。<br>動かす場所を選ぶ — 自分で運用するなら Agent SDK、長時間の作業を任せるなら Managed Agents を選びます。<br>監査が要るなら手順を固定する — 監査や誤りの許容度が厳しい業務は、手順を固定したワークフローにします。 | 済 |
| M6 | `l5-long-running` | 古いツール結果を減らす — 古いツール結果が溜まったら、コンテキストの編集で古い結果から外します。<br>調べものを切り離す — 文脈を埋める調べものはサブエージェントに任せ、親は要約だけを受け取ります。<br>新しく始める基準 — 2 回直しても直らないときと、関係のない作業に移るときは、新しいセッションで始めます。<br>セッションをまたいで覚える — セッションをまたいで要る情報は、会話ではなくファイルやメモリーに書き出します。 | 済 |
| M6 | `l6-diagnose` | トレースで原因を探す — エージェントの不具合は、実行の記録を順に読み、どの設計が欠けているかで分けます。<br>終わらないループ — 終わらないループには、止まる条件と回数の上限を足します。<br>途中で返ってきた応答 — stop_reason が pause_turn の応答は、内容を変えずに送り直して続きを受け取ります。 | 済 |
| M7 | `l3-grounding` | 出典を付けて返す — 資料に基づく回答は、引用の機能で出典の位置を付けて返します。<br>引用のない主張を外す — 資料の引用が付かない主張は、答えから外すか「資料にない」と返します。<br>全部入れるか、探して入れるか — 資料が小さく変わらないなら全文を入れ、大きいか変わりやすいなら要る部分だけを探して入れます。 | 6-4 | 未着手 |
| M7 | `l4-keys` | キーはサーバーに置く — API キーは画面のコードに入れず、自分のサーバーから Claude を呼びます。<br>環境ごとに分ける — 開発と本番はワークスペースを分け、キーも使用量も別にします。<br>管理用のキーは別物 — Admin キーは組織の管理のためのキーで、Claude の呼び出しには使いません。<br>入れ替えて見張る — キーには期限を付けて定期的に入れ替え、使用量をキーごとに見張ります。 | 7-3 | 未着手 |
| M0 | `l1-exam-overview`(改訂) | 「受験できる人」(0-1-2)と「監督つきの試験」(0-1-3)は申請と実施の仕組みを扱うので外し、試験の形(70 問・120 分・場面を読む選択問題)と誤答の選択肢の見分け方に置き換えます。既存レッスンの削除が進捗データに与える影響を先に確かめます。 | — | 未着手 |

### 追加する課題

状態はこの計画での作業について記します。

- M2 `q04-fix-stream-end`（修正・未着手）
- M3 `q03-place-breakpoints`（自力・未着手）
- M5 `q03-mcp-catalog`（計画済みの課題を実装・未着手）。課題フォルダーは既存です。
- M6 `q03-guarded-loop`（自力・未着手）
- M7 `q03-grounded-answer`（自力・未着手）
- M8 `q02-calibrate-judge`（計画済みの課題を実装・未着手）。課題フォルダーは既存です。
- M8 `q03-resolve-permissions`（自力・未着手）
- M8 `q04-triage-failures`（自力・未着手）

## クレジット(原典)

このステージは、公式ドキュメントと Anthropic の記事を **材料として参照し、社内エンジニア向けに順序・粒度を組み直した独自教材**です。
翻訳・転載ではなく、本文・図解・知識問題はすべて自作します。資料と使用箇所の対応は単元の `references.json` に記録し、
各トピック・まとめ・知識問題の出典表示はそこから生成します。

- 公式ドキュメントの文章・図・コード例はそのまま使いません。コード例は教材用に書きます
- 試験ガイド・準備の講座・サンプル問題は Partner Academy の利用条件の下にあるので、教材に写しません
- Claude / Claude Code / Agent SDK / MCP は製品名・仕様名として本文で使います。公式のロゴは使いません
