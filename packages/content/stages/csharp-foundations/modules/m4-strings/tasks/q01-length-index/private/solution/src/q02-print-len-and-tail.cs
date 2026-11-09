// Q02 長さと末尾
// 文字列の位置は s[i] です。先頭は s[0]、末尾は s[s.Length - 1] です。長さ 0 のときは先に Length を見て、存在しない位置は読みません。文字はシングルクォート、文字列はダブルクォートです。
// 構文: .Length、s[s.Length - 1]
// 引数: string s（1文字以上）
// 出力: 長さと末尾（2行）
// テスト: "2026" → 4 と 6 / "A" → 1 と A

public static partial class Answers
{
    public static void Q02PrintLenAndTail(string s)
    {
        Console.WriteLine(s.Length);
        Console.WriteLine(s[s.Length - 1]);
    }
}
