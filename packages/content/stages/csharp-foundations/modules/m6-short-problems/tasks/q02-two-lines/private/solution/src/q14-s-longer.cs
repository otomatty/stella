// Q14 S のほうが長いか
// 1行目に S、2行目に T を入力する。空文字は何も入力せず改行する。
// 中身を 1 文字ずつ見なくてよい問が多い。先頭だけ見る問は s[0]。
// 構文: Length、>
// 出力: Yes / No
// テスト: abcd/ab → Yes / ab/abcd → No / ab/ab → No

public static partial class Answers
{
    public static void Q14SLonger()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        if (s.Length > t.Length)
        {
            Console.WriteLine("Yes");
        }
        else
        {
            Console.WriteLine("No");
        }
    }
}
