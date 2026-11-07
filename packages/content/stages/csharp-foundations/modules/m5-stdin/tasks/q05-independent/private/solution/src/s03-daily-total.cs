// S03 日別の記録
// 1行目 N、続く N 行の整数の合計を表示する。0≦N≦20。N=0 なら続く行はない。
// 例: 3 / 5 / -2 / 4→7、0→0

public static partial class Answers
{
    public static void S03DailyTotal()
    {
        int n = int.Parse(Console.ReadLine());
        int total = 0;
        for (int i = 0; i < n; i++)
        {
            total = total + int.Parse(Console.ReadLine());
        }
        Console.WriteLine(total);
    }
}
