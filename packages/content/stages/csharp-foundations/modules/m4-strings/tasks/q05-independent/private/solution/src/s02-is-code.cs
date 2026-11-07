// S02 表記の条件
// 文字列sが4文字以上6文字以下で、すべて半角数字ならtrue、それ以外falseを返す。
// 例: 0123→true、12a4→false、空→false

public static partial class Answers
{
    public static bool S02IsCode(string s)
    {
        if (s.Length < 4 || s.Length > 6)
        {
            return false;
        }
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9')
            {
                return false;
            }
        }
        return true;
    }
}
