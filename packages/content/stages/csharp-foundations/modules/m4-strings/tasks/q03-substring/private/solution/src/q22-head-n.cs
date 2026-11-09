// Q22 先頭 N 文字
// 部分文字列は Substring で切ります。数値にしないので、先頭の 0 は残します。
// 構文: Substring(0, n)
// 引数: string s, int n（0 <= n && n <= s.Length）
// 戻り値: string
// テスト: ("abcdef", 2) → "ab" / ("abcdef", 6) → "abcdef" / ("A", 1) → "A"

public static partial class Answers
{
    public static string Q22HeadN(string s, int n)
    {
        return s.Substring(0, n);
    }
}
