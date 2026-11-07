// S07 表示が違う場所
// 同じ長さの文字列 S と T を 2 行で受け取り、同じ位置の文字が異なる個数を表示する。
// 例: abcd / abXd→1

public static partial class Answers
{
    public static void S07CountDiff()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] != t[i])
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
