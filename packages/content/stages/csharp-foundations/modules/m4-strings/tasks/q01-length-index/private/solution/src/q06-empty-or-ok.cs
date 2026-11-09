// Q06 空文字か
// 文字列の位置は s[i] です。先頭は s[0]、末尾は s[s.Length - 1] です。長さ 0 のときは先に Length を見て、存在しない位置は読みません。文字はシングルクォート、文字列はダブルクォートです。
// 構文: .Length、==
// 引数: string s
// 戻り値: string（empty / ok）
// テスト: "" → empty / "a" → ok / " " → ok

public static partial class Answers
{
    public static string Q06EmptyOrOk(string s)
    {
        if (s.Length == 0)
        {
            return "empty";
        }
        return "ok";
    }
}
