// S09 二つの表示
// 文字列sの半角数字の個数を1行目、半角英大文字の個数を2行目に表示する。
// 例: A1b02Z→3 / 2、空→0 / 0

public static partial class Answers
{
    public static void S09PrintDigitAndUpper(string s)
    {
        int digits = 0;
        int upper = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] >= '0' && s[i] <= '9')
            {
                digits = digits + 1;
            }
            if (s[i] >= 'A' && s[i] <= 'Z')
            {
                upper = upper + 1;
            }
        }
        Console.WriteLine(digits);
        Console.WriteLine(upper);
    }
}
