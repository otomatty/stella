/**
 * C# の課題 (runner `dotnet-test`) のファイル名と、ビルド出力の置き場所。
 *
 * 課題が選べるのは runnerId だけで、起動するコマンドは拡張の手順が固定で持つ。
 * ここには、その手順と task.json の検証が共有する名前だけを置く。
 *
 * ビルドの出力 (bin/obj) は `.stella/dotnet/` に出す。`.stella` は課題フォルダーを
 * 歩く処理が入らないので、生成物が提出の照合に混ざらない。歩く対象から `bin` や
 * `obj` を外すと、JavaScript の課題の `bin/` まで提出から消えてしまう。
 */

export const DOTNET_PROJECT_FILE = "Task.csproj";
export const DOTNET_LOCK_FILE = "packages.lock.json";

/** 課題のルートに置き、配布物として改変を照合する .NET の設定ファイル。 */
export const DOTNET_PROTECTED_FILES = [
  DOTNET_PROJECT_FILE,
  DOTNET_LOCK_FILE,
  "Directory.Build.props",
  "Directory.Build.targets",
  "NuGet.config",
] as const;

/** ビルドの出力 (bin/obj) の置き場所 (課題フォルダーからの相対パス)。 */
export const DOTNET_OUTPUT_DIR = ".stella/dotnet";

/** restore が済んだかを見るファイル。 */
export const DOTNET_ASSETS_FILE = ".stella/dotnet/obj/project.assets.json";
