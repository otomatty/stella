// Q26 数字の個数を出す
// 文字列を 1 行入力する。空文字は何も入力せず改行する。
// 空は長さ 0 として No になることが多い。
// 構文: 数える
// 出力: 個数
// テスト: 20a6 → 3 / abc → 0

public static partial class Answers
{
    public static void Q26CountDigits()
    {
        string s = Console.ReadLine();
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] >= '0' && s[i] <= '9')
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
