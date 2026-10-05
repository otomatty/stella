# 課題の見本 (`.stella/task.json`)

新しい実行基盤 (`src/runner/`) を手元で試すための見本。Extension Development Host でこのフォルダーを開き、
課題のファイルを開いた状態でコマンドパレットから **STELLA: 課題を確認する** を実行する。

| フォルダー | runner | 試せること |
| --- | --- | --- |
| `first-page/` | `static-preview` | Node.js が無くても動く HTML の確認。最初は見出しが違うので「直すところがあります」になる。`<h1>` を「今日の学習予定」に直して保存すると通る |
| `env-check/` | `env-diagnose` | Node.js・npm・Git の版を、課題の要件 (`environment`) と照合する |

本番の課題は教材リポジトリ (`packages/content`) が正本になり、拡張が受講者の学習フォルダーへ配る予定。
この見本は拡張の動作確認用で、受講者には配らない。
