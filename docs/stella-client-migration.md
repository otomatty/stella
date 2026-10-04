# STELLA クライアント識別子の移行

Phase D では Web の保存キーと VS Code 拡張の識別子を STELLA に統一する。
新拡張の ID は `stella.stella`、バージョンは `0.3.0`。
コードの正本は [otomatty/stella](https://github.com/otomatty/stella)。

## Web の保存データ

`falcon_` で始まる認証・サイドバー・開発者表示・初回案内・解放通知・
スキルツリー閲覧記録のキーは、同じ接尾辞の `stella_` キーへ初回読み取り時に移す。
sessionStorage のログイン後の戻り先も同じ規則で移す。
新キーに値があるときは新しい値を優先し、利用者 ID ごとの記録は混ぜない。
書き込みに失敗した場合は旧値を残す。ログアウト時は認証の新旧キーを両方消す。

この移行で読めるのは同じブラウザオリジンの保存値だけ。
Phase C で URL が変わった利用者や、JWT の期限が切れた利用者は Google ログインし直す。
学習進捗や提出は D1 上のデータなので、キー変更では変わらない。
更新後は開いたままの旧 Web タブを閉じる。

## VS Code の切替

拡張 ID は `falcon.informal` から `stella.stella` へ変わる。
VS Code は別の拡張として扱うため、旧拡張への自動更新では切り替わらない。

1. 配布された `stella-0.3.0.vsix` を「Extensions: Install from VSIX...」でインストールする。
2. 旧拡張を無効にして、VS Code を再読み込みする。
3. 必要なら `stella.serverUrl` / `stella.webUrl` を設定する。
   旧 `falcon.serverUrl` / `falcon.webUrl` は読み取り互換で引き継ぐ。
   新名の設定を明示した場合はそちらを優先する。
4. 新 Web のコードレッスンから「VS Code で開く」を押して接続し直す。

新 Web は `vscode://stella.stella/lesson?...&code=...` を発行する。
旧 URI は旧拡張に届くため、新拡張への転送はできない。新 Web から開き直す。

SecretStorage は拡張 ID ごとに分かれているので、別 ID の旧 JWT は読み出さない。
新接続の JWT は `stella.accessToken` に保存する。
同じ拡張スコープに旧キーが残っている場合だけ、新キーへ移す。

演習フォルダーは `~/.stella/exercises/<assignmentId>` を使う。
新フォルダーがまだ無い課題は、`~/.falcon-informal/exercises/<assignmentId>` にある
編集済みファイルを保存してからコピーする。旧フォルダーは削除しない。
新フォルダーがある場合は、その内容を上書きしない。
旧フォルダーを開いたままの採点も、そのフォルダーのファイルを読む。

## 配布と公開

GitHub Actions の Release VS Code Extension が VSIX を作る。
Marketplace への公開は別の作業で、`stella` publisher の登録・権限確認が必要。
この変更で Marketplace への公開や本番デプロイを実行しない。

切替時には利用者へ、新 VSIX のインストール・旧拡張の無効化・Web からの再接続を案内する。
