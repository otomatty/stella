// Q16 両方空なら empty、それ以外は ok
// 1行目に S、2行目に T を入力する。空文字は何も入力せず改行する。
// 中身を 1 文字ずつ見なくてよい問が多い。先頭だけ見る問は s[0]。
// 構文: Length == 0、&&
// テスト: 空と空 → empty / a と空 → ok

public static partial class Answers
{
    public static void Q16BothEmpty()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        if (s.Length == 0 && t.Length == 0)
        {
            Console.WriteLine("empty");
        }
        else
        {
            Console.WriteLine("ok");
        }
    }
}
