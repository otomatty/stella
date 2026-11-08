// Q15 S の長さを出す
// 1行目に S、2行目に T を入力する。空文字は何も入力せず改行する。
// 中身を 1 文字ずつ見なくてよい問が多い。先頭だけ見る問は s[0]。
// 構文: Length（T は読んでも使わない）
// テスト: abc なら 3

public static partial class Answers
{
    public static void Q15LenS()
    {
        string s = Console.ReadLine();
        Console.ReadLine();
        Console.WriteLine(s.Length);
    }
}
