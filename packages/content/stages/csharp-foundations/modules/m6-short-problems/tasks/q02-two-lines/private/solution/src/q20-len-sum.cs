// Q20 両方の長さの合計
// 1行目に S、2行目に T を入力する。空文字は何も入力せず改行する。
// 中身を 1 文字ずつ見なくてよい問が多い。先頭だけ見る問は s[0]。
// 構文: Length、+
// テスト: abc と de → 5

public static partial class Answers
{
    public static void Q20LenSum()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        Console.WriteLine(s.Length + t.Length);
    }
}
