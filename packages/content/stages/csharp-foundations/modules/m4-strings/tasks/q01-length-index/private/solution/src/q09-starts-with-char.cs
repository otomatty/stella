// Q09 先頭が文字 c か
// 文字列の位置は s[i] です。先頭は s[0]、末尾は s[s.Length - 1] です。長さ 0 のときは先に Length を見て、存在しない位置は読みません。文字はシングルクォート、文字列はダブルクォートです。
// 構文: s[0]、==
// 引数: string s（1文字以上）, char c
// 戻り値: bool
// テスト: ("abc", 'a') → true / ("abc", 'b') → false / ("A", 'A') → true

public static partial class Answers
{
    public static bool Q09StartsWithChar(string s, char c)
    {
        return s[0] == c;
    }
}
