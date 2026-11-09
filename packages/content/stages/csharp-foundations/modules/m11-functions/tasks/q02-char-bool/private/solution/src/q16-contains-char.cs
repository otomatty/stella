// Q16 文字 c を含むか
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 引数: string s, char c
// 例: ("abc", 'b') → true / ("abc", 'z') → false

public static partial class Answers
{
    public static bool Q16ContainsChar(string s, char c)
    {
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == c) return true;
        }
        return false;
    }
}
