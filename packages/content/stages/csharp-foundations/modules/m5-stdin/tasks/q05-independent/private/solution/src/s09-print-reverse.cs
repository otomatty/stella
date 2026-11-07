// S09 列の逆順
// 1行目 N、2行目 N 個の整数。入力と逆順に1行ずつ表示する。1≦N≦20。
// 例: 3 / 7 2 9→9 / 2 / 7

public static partial class Answers
{
    public static void S09PrintReverse()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        for (int i = n - 1; i >= 0; i--)
        {
            Console.WriteLine(int.Parse(parts[i]));
        }
    }
}
