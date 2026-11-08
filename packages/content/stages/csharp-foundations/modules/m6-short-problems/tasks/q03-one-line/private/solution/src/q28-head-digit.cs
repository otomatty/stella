// Q28 先頭が数字か（空は No）
// 文字列を 1 行入力する。空文字は何も入力せず改行する。
// 空は長さ 0 として No になることが多い。
// 構文: s[0]
// テスト: 1ab → Yes / a12 → No / 空 → No

public static partial class Answers
{
    public static void Q28HeadDigit()
    {
        string s = Console.ReadLine();
        if (s.Length == 0)
        {
            Console.WriteLine("No");
            return;
        }
        if (s[0] >= '0' && s[0] <= '9')
        {
            Console.WriteLine("Yes");
        }
        else
        {
            Console.WriteLine("No");
        }
    }
}
