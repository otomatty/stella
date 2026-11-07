// S07 中央の部分
// 6 文字の s から中央 2 文字を返す関数を作る。次に、長さが 6 で中央 2 文字が半角数字なら true を返す関数から呼ぶ。長さ不足なら呼び出さず false。
// 例: AB12CD→true、ABx2CD→false、A→false

public static partial class Answers
{
    public static bool S07Middle2IsDigits(string s)
    {
        static string Middle2(string text)
        {
            return text.Substring(2, 2);
        }
        static bool IsDigitN(string text, int length)
        {
            if (text.Length != length) return false;
            for (int i = 0; i < text.Length; i++)
            {
                if (text[i] < '0' || text[i] > '9') return false;
            }
            return true;
        }
        if (s.Length != 6) return false;
        return IsDigitN(Middle2(s), 2);
    }
}
