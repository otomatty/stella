// Q14 全部数字か（長さは問わない。空は false）
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 関数名: IsAllDigits
// 例: "123" → true / "12a" → false / "" → false

public static partial class Answers
{
    public static bool Q14IsAllDigits(string s)
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
