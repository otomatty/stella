// R1
// 
// 空でなく半角数字のみならtrueを返す。

public static partial class Answers
{
    public static bool R1Digits(string s)
    {
        if (s.Length == 0)
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
