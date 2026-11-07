// Q17 先頭の文字が同じか（どちらも 1 文字以上）
// 1行目に S、2行目に T を入力する。空文字は何も入力せず改行する。
// 中身を 1 文字ずつ見なくてよい問が多い。先頭だけ見る問は s[0]。
// 構文: s[0]、t[0]
// テスト: abc/ax → Yes / abc/x → No

public static partial class Answers
{
    public static void Q17SameHead()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        if (s[0] == t[0])
        {
            Console.WriteLine("Yes");
        }
        else
        {
            Console.WriteLine("No");
        }
    }
}
