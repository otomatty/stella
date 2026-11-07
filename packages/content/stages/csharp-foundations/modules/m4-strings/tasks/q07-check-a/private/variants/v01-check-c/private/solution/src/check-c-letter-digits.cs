// 配布文
// 
// 文字列sがちょうど5文字で、先頭1文字は半角大文字、残り4文字は半角数字ならtrue、それ以外falseを返す。
// 
// 例: A0123→true

public static partial class Answers
{
    public static bool CheckCLetterDigits(string s)
    {
        if (s.Length != 5)
        {
            return false;
        }
        if (s[0] < 'A' || s[0] > 'Z')
        {
            return false;
        }
        for (int i = 1; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9')
            {
                return false;
            }
        }
        return true;
    }
}
