import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argument = process.argv[2] ?? "3000";
const port = Number(argument);
if (process.argv.length > 3 || !/^[0-9]+$/.test(argument) || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("使い方: node server.mjs [1〜65535 のポート番号]");
  process.exit(1);
}

// このファイルのあるフォルダーだけを表示します。
const root = await fs.realpath(path.dirname(fileURLToPath(import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
};
function inside(file) {
  const relative = path.relative(root, file);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

const server = http.createServer(async (request, response) => {
  const send = (status, text) => {
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end(text);
  };
  try {
    // URL として整理する前に、元のパスを調べます。
    const decoded = decodeURIComponent((request.url ?? "/").split(/[?#]/)[0]);
    const relative = decoded.slice(1);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || decoded.includes("\0") || path.win32.isAbsolute(relative) || relative.split("/").includes("..")) {
      send(403, "このフォルダーの外は表示できません。");
      return;
    }
    const normalized = path.normalize(relative || "index.html");
    const target = path.resolve(root, normalized);
    if (!inside(target)) {
      send(403, "このフォルダーの外は表示できません。");
      return;
    }
    // リンク先も、途中のフォルダーから順に確かめます。
    let actual = root;
    for (const part of normalized.split(path.sep)) {
      actual = await fs.realpath(path.join(actual, part));
      if (!inside(actual)) {
        send(403, "このフォルダーの外は表示できません。");
        return;
      }
    }
    if (!(await fs.stat(actual)).isFile()) {
      send(404, "ファイルが見つかりません。");
      return;
    }
    const content = await fs.readFile(actual);
    response.writeHead(200, {
      "Content-Type": types[path.extname(target).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": content.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (error instanceof URIError) send(400, "URL の文字を確かめてください。");
    else if (error.code === "ENOENT" || error.code === "ENOTDIR") send(404, "ファイルが見つかりません。");
    else if (error.code === "EACCES" || error.code === "EPERM" || error.code === "ELOOP") send(403, "このファイルは表示できません。");
    else send(500, "ファイルを読み込めませんでした。");
  }
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`${port} は使われています。node server.mjs 3001 のように別の番号で起動してください。`);
  } else {
    console.error("起動できませんでした。ポート番号と端末の権限を確かめてください。");
  }
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log(`http://localhost:${port} で表示しています。止めるときは Ctrl+C を押します。`);
});
