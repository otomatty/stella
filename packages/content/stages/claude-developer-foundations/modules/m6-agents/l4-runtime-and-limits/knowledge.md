---
sourceRefs: [SRC-claude-code-agent-loop-control-20261031, SRC-claude-managed-agents-20261118, SRC-claude-managed-agent-environment-20261126, SRC-claude-managed-agent-permission-policies-20261126, SRC-anthropic-effective-agents-20261031, SRC-anthropic-multi-agent-research-20261126]
---
## 知識問題

### Q1. 棚卸しの実行が error_max_budget_usd で終わりました。倉庫のうち一つを読み終えています。画面と実行記録をどう扱いますか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. 読めた倉庫の数字を最終結果として出し、次回の上限を上げる
- B. 予算で中断と表示し、セッション ID・費用・ターン数を控える
- C. 残りの集計を同じ予算で自動的にやり直し、完了した実行だけを記録する

<details>
<summary>解答</summary>

**B** — 予算に達した結果に result はありません。中断を明示し、共通の項目で実行を追えるようにします。

</details>

### Q2. 親と二つの作業役が集計する処理で、使える金額が決まっています。応答が届いた時点で費用が上限を少し超えました。設定をどう見直しますか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. 最大ターン数だけを下げ、毎回の費用は同じと見積もる
- B. 同じ予算を設定して、依頼に「最後の応答は短く」と書き足す
- C. 応答と停止までにかかる作業役の費用を見込み、予算の設定額に余裕を取る

<details>
<summary>解答</summary>

**C** — 応答を受け取ってから予算と照合するので、その応答の費用が加わります。動いていた作業役の停止までの費用も見込みます。

</details>

### Q3. 夜間に資料を照合し、担当者が画面を閉じたあとも進捗を受け取りたいです。照合ツールだけは自社の基盤で動かす必要があります。どの構成が合いますか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. 自社基盤のサンドボックスを使う Managed Agents にし、会話とツール結果の送信を前提にする
- B. 既定のクラウド環境を使い、ツールの説明文に「自社基盤で実行」と書く
- C. Agent SDK を担当者の端末で動かし、端末が閉じたあとの処理をチャットの再開に任せる

<details>
<summary>解答</summary>

**A** — サンドボックスの実行場所を自社基盤にできます。ループは Anthropic が運用し、会話とツール結果もそこに届きます。

</details>

### Q4. Managed Agents が台帳を更新する組み込みツールを使います。更新のたびに担当者が内容を見て判断するにはどう設定しますか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. auto にして、サーバーが安全と判断した更新はそのまま実行する
- B. 対象ツールを always_ask にして、担当者の確認を待つ
- C. always_allow にして、実行が済んだあとにイベントを担当者へ送る

<details>
<summary>解答</summary>

**B** — always_ask は対象ツールを呼ぶたびに承認を待ちます。auto ではサーバーが呼び出しごとに判断します。

</details>

### Q5. 旅費の確認では、領収書の照合、合計、担当者への報告の順を監査で示します。どの設計を選びますか？
<!-- kind: single; skills: claude-workflows -->

- A. 一つのエージェントに手順を選ばせ、最後に順を説明させる
- B. 各段を別のエージェントに並列で任せ、報告に順序を書き添える
- C. 三つの段の順序をコードで固定し、照合対象と各段の結果を残す

<details>
<summary>解答</summary>

**C** — 後の段は前の段の結果を使います。コードで順を決めて各段の実行記録を残すと、規程と照合できます。

</details>

### Q6. 設計レビューで、幅広い調査に複数のエージェントを使う案が出ました。どの案件で試すと効果を確かめやすいですか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. 投資判断に使う資料で、地域ごとに別々の公開統計を集め、最後に比較する案件
- B. 一枚の台帳を順に照合し、前の判定を次の計算に使う日常業務
- C. 同じ仕様変更に対して、実装とテストを別々に解釈しながら同時に直す案件

<details>
<summary>解答</summary>

**A** — 地域ごとの調査を独立して走らせられます。成果の価値と、複数で動かす費用を比べて判断できます。

</details>
