// S08 英字の条件
// 空でなく、すべて半角大文字A〜Zならyes、それ以外noを返す。
// 例: ABC→yes、AbC→no、空→no

public static partial class Answers
{
    public static string S08AllUpper(string s)
    {
        if (s.Length == 0)
        {
            return "no";
        }
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < 'A' || s[i] > 'Z')
            {
                return "no";
            }
        }
        return "yes";
    }
}
