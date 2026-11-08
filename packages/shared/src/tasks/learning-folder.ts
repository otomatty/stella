/**
 * node_modules は npm が作る大きなフォルダー、last-run.json は毎回変わる手元の確認結果、
 * .stella/dotnet/ は C# のビルド出力なので記録しない。
 * .stella/task.json と .stella/distribution.json は課題の定義と配布の記録なのでコミットしてよい。
 */
export const LEARNING_FOLDER_GITIGNORE =
  "node_modules/\n**/.stella/last-run.json\n**/.stella/dotnet/\n";
