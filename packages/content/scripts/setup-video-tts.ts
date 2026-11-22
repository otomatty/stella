/** 教材動画のローカル音声合成に使う仮想環境を準備する。 */
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  isWave,
  openJtalkErrorDetail,
  openJtalkScript,
  openJtalkSetupHint,
  runTtsCommand,
  ttsVenv,
  venvPython,
} from "./lib/tts.js";

const versions = ["3.13", "3.12", "3.11", "3.10"];
const checkVersion =
  "import sys; raise SystemExit(not ((3, 10) <= sys.version_info[:2] <= (3, 13)))";
const checkPackages =
  "from importlib.metadata import version; version('pyopenjtalk-plus'); import pyopenjtalk";
const pythonHint = "Python 3.10〜3.13 を使えるようにしてください";

export function setupVideoTts(
  run = runTtsCommand,
  platform = process.platform,
  venv = ttsVenv,
): void {
  const python = venvPython(venv, platform);
  const ready = join(venv, ".openjtalk-ready");

  function checked(command: string, args: string[], message: string, input?: string): Buffer {
    const result = run(command, args, input);
    if (result.status !== 0) {
      const detail = result.stderr && openJtalkErrorDetail(result.stderr);
      throw new Error(
        `${message}\n${detail || result.error?.message || `終了コード: ${result.status}`}`,
      );
    }
    return result.stdout;
  }

  try {
    if (
      run(python, ["-c", checkVersion]).status !== 0 ||
      run(python, ["-c", checkPackages]).status !== 0
    ) {
      rmSync(venv, { recursive: true, force: true, maxRetries: 3 });
      const uv = run("uv", ["--version"]).status === 0;
      if (uv) {
        checked(
          "uv",
          ["venv", "--python", ">=3.10,<3.14", "--no-python-downloads", venv],
          `仮想環境を作れませんでした。${pythonHint}`,
        );
      } else {
        const candidates = [
          ["python3"],
          ["python"],
          ...versions.map((version) => [`python${version}`]),
          ...(platform === "win32" ? versions.map((version) => ["py", `-${version}`]) : []),
        ];
        const base = candidates.find(
          ([command, ...args]) => run(command, [...args, "-c", checkVersion]).status === 0,
        );
        if (!base) throw new Error(`対応する Python が見つかりません。${pythonHint}`);
        const [command, ...args] = base;
        checked(command, [...args, "-m", "venv", venv], "仮想環境を作れませんでした");
      }

      const wheel = ["--only-binary", ":all:", "pyopenjtalk-plus"];
      checked(
        uv ? "uv" : python,
        uv
          ? ["pip", "install", "--python", python, ...wheel]
          : ["-m", "pip", "install", "--no-input", ...wheel],
        "pyopenjtalk-plus の wheel をインストールできませんでした。ネット接続と Python の版・OS を確認してください",
      );
    }

    if (!existsSync(ready)) {
      const audio = checked(python, [openJtalkScript], "試験合成に失敗しました", "こんにちは。");
      if (!isWave(audio)) throw new Error("試験合成で WAV (RIFF/WAVE) を取得できませんでした");
      writeFileSync(ready, "");
    }
  } catch (error) {
    const message = (error as Error).message;
    try {
      rmSync(venv, { recursive: true, force: true, maxRetries: 3 });
    } catch (cleanupError) {
      throw new Error(
        `Open JTalk の準備に失敗しました。${message}\n${venv} を削除できませんでした (${(cleanupError as Error).message})。仮想環境を使っているプロセスを終了し、${openJtalkSetupHint} を再実行してください`,
      );
    }
    throw new Error(
      `Open JTalk の準備に失敗しました。${message}\n原因を解消してから ${openJtalkSetupHint} を再実行してください`,
    );
  }
  console.log(`Open JTalk の準備ができました (試験合成の WAV を確認済み) — ${python}`);
}

if (import.meta.main) {
  try {
    setupVideoTts();
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
