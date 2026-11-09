// Q18 長さ n 以上かつ全部数字か
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 例: ("12345", 3) → true / ("12", 3) → false / ("12a", 3) → false

public static partial class Answers
{
    public static bool Q18IsDigitsAtLeast(string s, int n)
    {
        static bool IsAllDigits(string text)
        {
            if (text.Length == 0) return false;
            for (int i = 0; i < text.Length; i++)
            {
                if (text[i] < '0' || text[i] > '9') return false;
            }
            return true;
        }
        if (s.Length < n) return false;
        return IsAllDigits(s);
    }
}
