// Q21 ★ 全部数字か（空は No）
// 文字列を 1 行入力する。空文字は何も入力せず改行する。
// 空は長さ 0 として No になることが多い。
// 構文: for、'0'〜'9'
// 出力: Yes / No
// テスト: 123 → Yes / 12a → No / 0 → Yes / 空 → No

public static partial class Answers
{
    public static void Q21AllDigits()
    {
        string s = Console.ReadLine();
        if (s.Length == 0)
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
