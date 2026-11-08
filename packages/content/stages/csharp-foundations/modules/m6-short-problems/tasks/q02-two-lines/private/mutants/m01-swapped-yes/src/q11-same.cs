// Q11 ★ 一致
// 1行目に S、2行目に T を入力する。空文字は何も入力せず改行する。
// 中身を 1 文字ずつ見なくてよい問が多い。先頭だけ見る問は s[0]。
// 構文: ==
// 出力: Yes / No
// テスト: abc/abc → Yes / abc/ab → No / A/a → No

public static partial class Answers
{
    public static void Q11Same()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        if (s == t)
        {
            Console.WriteLine("No");
        }
        else
        {
            Console.WriteLine("Yes");
        }
    }
}
