// Q15 全部 A〜Z か（空は false）
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 例: "ABC" → true / "ABc" → false / "" → false

public static partial class Answers
{
    public static bool Q15IsAllUpper(string s)
    {
        if (s.Length == 0) return false;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < 'A' || s[i] > 'Z') return false;
        }
        return true;
    }
}
