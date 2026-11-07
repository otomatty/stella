// Q19 半角空白を含むか
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 例: "a b" → true / "ab" → false / "" → false

public static partial class Answers
{
    public static bool Q19ContainsSpace(string s)
    {
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == ' ') return true;
        }
        return false;
    }
}
