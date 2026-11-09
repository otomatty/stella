// Q24 文字 a を含むか
// 文字列を 1 行入力する。空文字は何も入力せず改行する。
// 空は長さ 0 として No になることが多い。
// 構文: for
// 出力: Yes / No
// テスト: banana → Yes / xyz → No

public static partial class Answers
{
    public static void Q24ContainsA()
    {
        string s = Console.ReadLine();
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == 'a')
            {
                Console.WriteLine("Yes");
                return;
            }
        }
        Console.WriteLine("No");
    }
}
