// Q20 数字以外を含まないかつ長さ 1 以上
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 例: "0" → true / "" → false / "0a" → false

public static partial class Answers
{
    public static bool Q20IsNonEmptyDigits(string s)
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
        return IsAllDigits(s);
    }
}
