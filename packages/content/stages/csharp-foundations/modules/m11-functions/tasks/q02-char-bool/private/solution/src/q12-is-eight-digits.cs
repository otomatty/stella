// Q12 ちょうど 8 桁の数字か
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 引数は string s だけ。中で 8 を使う。
// 例: "20260903" → true / "1234567a" → false / "" → false

public static partial class Answers
{
    public static bool Q12IsEightDigits(string s)
    {
        static bool IsDigitN(string text, int length)
        {
            if (text.Length != length) return false;
            for (int i = 0; i < text.Length; i++)
            {
                if (text[i] < '0' || text[i] > '9') return false;
            }
            return true;
        }
        return IsDigitN(s, 8);
    }
}
