# Kubernetes 入門 — カリキュラム構成 (準備中)

> **状態: 準備中。** スキルツリー上の位置と学習範囲を先に確保しているプレースホルダで、教材本体は未執筆。

## 講座の概要

- **到達目標 (canDo)**: Pod と Service でコンテナをクラスタに載せ、状態を kubectl で確認できる
- **前提講座**: `devops-basics`・`networking-ops-basics`・`deploy-ops-basics`。線の親は `networking-ops-basics`。
- **線の親**: `networking-ops-basics`（前提は3つ、線はネットワーク運用から）
- **参考にしたロードマップ**: roadmap.sh の DevOps ロードマップ（Container Orchestration）

- **配置メモ**: DevOps島のネットワーク運用の先に置きます。本土の公開・CIと運用も解放条件に含みますが、島への橋線は引きません。
## 収録を予定している内容

- なぜコンテナをオーケストレーションするか
- Pod とコンテナの関係
- Deployment で台数を保つ
- Service で届ける
- kubectl で状態を見る

## 執筆時のメモ

- 現在は M0 に準備中の案内 1 トピックだけを置いている。本執筆時は `packages/content/ADDING_COURSE.md` の手順で M1 以降を追加し、この CURRICULUM.md を確定版に書き換える。
- 前提講座を変える場合は course.json と本ファイルの両方を更新する (グラフ検査の対象)。
