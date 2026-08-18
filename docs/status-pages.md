# ステータス画面 (404 / 403 / エラー)

「ページが存在しない」「権限が無い」「描画に失敗した」の 3 つを、共通レイアウト
`StatusScreen` の上に別々の画面として実装している。従来はいずれも `GenericEmpty`
（「このページは未実装です。」）に落ちていて、原因も次の行動も伝わらなかった。

## 構成

| 画面 | コンポーネント | 発火点 |
|------|----------------|--------|
| 404 | `components/common/NotFoundScreen.tsx` | `routes/_app/$.tsx`（シェル配下のキャッチオール）/ `__root` の `notFoundComponent` / router の `defaultNotFoundComponent` |
| 403 | `components/common/AccessDeniedScreen.tsx` | `components/shell/RoleGuard.tsx`（ロール外の URL 直叩き） |
| エラー | `components/common/AppErrorScreen.tsx` | router の `defaultErrorComponent` / `__root` の `errorComponent` |

共通レイアウトは `components/common/StatusScreen.tsx`（コード表示 + 見出し + 説明 +
主導線ボタン + 補助リンク）。

## 設計上の判断

- **シェルの中で出す。** 未知の URL は `_app/$` が受けるので、サイドバー / トップバーを
  保ったまま 404 になる。`AppShellContext` の有無で単独画面（Brand 付き）へ自動的に
  切り替わるため、公開ルート側でも同じコンポーネントが使える。
- **ルート優先順位。** splat (`$`) は静的 / 動的ルートより後に評価されるため、
  `/support` や `/verify/$certCode` などの既存ルートには影響しない。
- **ログイン後の復帰先。** 未ログインで保護 URL を開くと `AppShell` がその URL を
  `POST_LOGIN_REDIRECT_KEY` に控えるが、404 の URL は除外している（ログイン直後に
  また 404 を踏ませないため）。
- **エラーは最も近い境界で捕まえる。** `defaultErrorComponent` は各ルートの
  CatchBoundary に効くので、ページ内の例外はページ枠だけがエラー画面に差し替わり、
  シェルは生き残る。`AppShell` 自体が落ちた場合だけ単独画面になる。
- **404 と 403 を分ける。** 「存在しない」と「権限が無い」は対処が違う（前者は導線を
  出す、後者は管理者への依頼を促す）。403 では要求ロールと現在のロールを明示する。
- Cloudflare Workers Static Assets は `not_found_handling = "single-page-application"`
  なので、未知の URL はサーバ 404 ではなく index.html にフォールバックし、上記の
  クライアント側 404 が表示される（`apps/web/wrangler.toml`）。

## 今後の候補（未実装）

- **メンテナンス / 障害告知画面**: API が 503 を返したときの共通表示。現状は各画面が
  個別にエラーメッセージを出している。
- **オフライン検知**: `navigator.onLine` を見て「接続が切れています」を出す。
  レッスン進捗は localStorage 同期があるため相性が良い。
- **セッション期限切れ**: JWT 期限切れ時に無言でログイン画面へ戻る現状を、理由を
  伝える画面（もしくは Toast + 復帰先保持）に変える。
- **利用規約 / プライバシーポリシー**: 公開ルート（`/terms`, `/privacy`）。運用開始前に必要。
