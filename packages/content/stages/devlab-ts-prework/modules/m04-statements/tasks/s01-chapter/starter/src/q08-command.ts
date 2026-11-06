// 04-q08 ★総合問題 コマンドの解析
//
// 教材: 04章のこれまでの教材
//
// 問題
// "add 3 5" のような文字列のコマンドを読み取って計算する、小さな電卓を作ります。
// 型 Command と RunResult は定義済みです。引数と戻り値には型注釈を付けること。
//
// 1. parseCommand(text)
//    文字列を Command にする。前後の空白を取り除き、空白（いくつ続いてもよい）で区切る。
//    次のときは、決められたメッセージで Error を投げる
//    - 3つに区切れない:                 "書き方が正しくありません: <text>"
//    - 1つ目が add、sub、mul、div 以外: "知らない計算です: <1つ目>"
//    - 2つ目か3つ目が有限の数値でない: "数値ではありません: <その文字列>"
//    例: parseCommand("add 3 5") → { op: "add", a: 3, b: 5 }
//
// 2. execute(command)
//    計算して結果を返す。switch で op ごとに分ける。div で b が 0 なら "0で割ることはできません" の Error を投げる
//
// 3. run(text)
//    parseCommand と execute を順に呼ぶ。成功なら { ok: true, value }、
//    途中で例外が出たら catch して { ok: false, error: メッセージ } を返す
//
// 4. runAll(lines)
//    1行ずつ run し、成功なら "add 3 5 = 8"（前後の空白を除いた元の行 = 結果）、
//    失敗なら "エラー: メッセージ" を並べた配列を返す。引数は readonly string[]
//
// 前の問題を使う
// 使う問題: q05（errorMessage）、q06（toNumber）、q07（assertNever）
// - parseCommand の数値の読み取りには、q06 の toNumber を使う（null なら "数値ではありません: …" の Error）
// - execute の switch の default では、q07 の assertNever を使う
// - run の catch では、q05 の errorMessage でメッセージを取り出す
// どれも、このファイルの先頭で import してある。前の問題がまだ解けていないと、この問題も解けたと数えられない

import { errorMessage } from "./q05-exception";
import { toNumber } from "./q06-unknown";
import { assertNever } from "./q07-never";

export type Command = { op: "add" | "sub" | "mul" | "div"; a: number; b: number };

export type RunResult = { ok: true; value: number } | { ok: false; error: string };

export function parseCommand() {}

export function execute() {}

export function run() {}

export function runAll() {}
