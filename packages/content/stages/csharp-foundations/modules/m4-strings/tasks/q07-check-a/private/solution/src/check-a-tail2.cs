// 配布文
// 
// 文字列sが3文字以上で、すべて半角数字なら末尾2文字を返す。それ以外Err。0〜20文字、nullなし。
// 
// 例: 0012→12

public static partial class Answers
{
    public static string CheckATail2(string s)
    {
        if (s.Length < 3)
        {
            return "Err";
        }
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9')
            {
                return "Err";
            }
        }
        return s.Substring(s.Length - 2, 2);
    }
}
