// Q23 末尾 N 文字
// 部分文字列は Substring で切ります。数値にしないので、先頭の 0 は残します。
// 構文: Substring(s.Length - n, n)
// 引数: string s, int n（0 <= n && n <= s.Length）
// 戻り値: string
// テスト: ("abcdef", 2) → "ef" / ("abcdef", 3) → "def" / ("A", 1) → "A"

public static partial class Answers
{
    public static string Q23TailN(string s, int n)
    {
        return s.Substring(s.Length - n, n);
    }
}
