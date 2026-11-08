// S04 二つのコード
// IsDigitN を自分で書き、文字列 a, b がどちらも半角数字 4 文字なら true を返す関数から呼ぶ。
// 例: 0123,9876→true、0123,9a76→false

public static partial class Answers
{
    public static bool S04BothFourDigits(string a, string b)
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
        return IsDigitN(a, 4) && IsDigitN(b, 4);
    }
}
