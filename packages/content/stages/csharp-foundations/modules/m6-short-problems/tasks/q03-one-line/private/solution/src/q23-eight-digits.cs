// Q23 ちょうど 8 桁の数字か
// 文字列を 1 行入力する。空文字は何も入力せず改行する。
// 空は長さ 0 として No になることが多い。
// 構文: 長さと数字
// テスト: 20260903 → Yes / 1234567a → No / 1234567 → No

public static partial class Answers
{
    public static void Q23EightDigits()
    {
        string s = Console.ReadLine();
        if (s.Length != 8)
        {
            Console.WriteLine("No");
            return;
        }
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9')
            {
                Console.WriteLine("No");
                return;
            }
        }
        Console.WriteLine("Yes");
    }
}
