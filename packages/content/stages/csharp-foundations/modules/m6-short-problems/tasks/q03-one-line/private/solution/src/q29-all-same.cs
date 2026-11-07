// Q29 全部同じ文字か（空は No）
// 文字列を 1 行入力する。空文字は何も入力せず改行する。
// 空は長さ 0 として No になることが多い。
// 構文: for、先頭と比べる
// テスト: aaa → Yes / aba → No / a → Yes

public static partial class Answers
{
    public static void Q29AllSame()
    {
        string s = Console.ReadLine();
        if (s.Length == 0)
        {
            Console.WriteLine("No");
            return;
        }
        for (int i = 1; i < s.Length; i++)
        {
            if (s[i] != s[0])
            {
                Console.WriteLine("No");
                return;
            }
        }
        Console.WriteLine("Yes");
    }
}
