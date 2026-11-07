// Q01 ★ 長さと先頭
// 文字列の位置は s[i] です。先頭は s[0]、末尾は s[s.Length - 1] です。長さ 0 のときは先に Length を見て、存在しない位置は読みません。文字はシングルクォート、文字列はダブルクォートです。
// 構文: .Length、s[0]
// 引数: string s（1文字以上）
// 出力: 1行目に長さ、2行目に先頭
// テスト: "2026" → 4 と 2 / "A" → 1 と A

public static partial class Answers
{
    public static void Q01PrintLenAndHead(string s)
    {
        Console.WriteLine(s.Length);
        Console.WriteLine(s);
    }
}
