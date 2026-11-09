// Q19 Yes を大文字で出す一致（Q11 と同じ判定、出力は YES / NO）
// 1行目に S、2行目に T を入力する。空文字は何も入力せず改行する。
// 中身を 1 文字ずつ見なくてよい問が多い。先頭だけ見る問は s[0]。
// 構文: ==
// テスト: abc/abc → YES

public static partial class Answers
{
    public static void Q19SameUpper()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        if (s == t)
        {
            Console.WriteLine("YES");
        }
        else
        {
            Console.WriteLine("NO");
        }
    }
}
