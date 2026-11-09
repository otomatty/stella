// 到達B 長さ
// 入力の各行は半角空白区切り。null 入力なし。
// 2行で文字列 S,T を受け取る。長さが同じなら SAME、違えば DIFFERENT を表示する。各 0〜20 文字。

public static partial class Answers
{
    public static void DbSameLength()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        if (s.Length == t.Length)
        {
            Console.WriteLine("SAME");
        }
        else
        {
            Console.WriteLine("DIFFERENT");
        }
    }
}
