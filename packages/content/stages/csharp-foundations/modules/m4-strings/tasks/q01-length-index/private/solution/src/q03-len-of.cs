// Q03 長さだけ
// 文字列の位置は s[i] です。先頭は s[0]、末尾は s[s.Length - 1] です。長さ 0 のときは先に Length を見て、存在しない位置は読みません。文字はシングルクォート、文字列はダブルクォートです。
// 構文: .Length
// 引数: string s
// 戻り値: int
// テスト: "abc" → 3 / "" → 0 / "12345" → 5

public static partial class Answers
{
    public static int Q03LenOf(string s)
    {
        return s.Length;
    }
}
