#!/usr/bin/env bash
# apps/web/.env.local を .example から生成（既存ファイルは上書きしない）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/apps/web/.env.local"
EXAMPLE="$ROOT/apps/web/.env.local.example"

if [[ -f "$TARGET" ]]; then
  echo "[setup] $TARGET は既に存在します（スキップ）"
else
  cp "$EXAMPLE" "$TARGET"
  echo "[setup] $TARGET を作成しました。Dashboard の API Keys を埋めてください。"
fi

echo ""
echo "Project: falcon-informal (jpanvybfaukpgqtwjljl)"
echo "URL:     https://jpanvybfaukpgqtwjljl.supabase.co"
echo "Dashboard: https://supabase.com/dashboard/project/jpanvybfaukpgqtwjljl/settings/api-keys"
echo ""
echo "次のステップ:"
echo "  1. apps/web/.env.local に VITE_SUPABASE_* と SUPABASE_SERVICE_ROLE_KEY を設定"
echo "  2. bun run supabase:push   # または SQL Editor で migrations を適用"
echo "  3. bun run seed:fixtures   # reads apps/web/.env.local via --env-file"
