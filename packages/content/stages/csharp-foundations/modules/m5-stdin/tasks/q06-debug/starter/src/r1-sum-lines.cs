// R1
// 1行目 N、続く N 行の整数の合計を1行表示する。0≦N≦5。

public static partial class Answers
{
    public static void R1SumLines()
    {
        int n = int.Parse(Console.ReadLine());
        int sum = 0;
        for (int i = 0; i <= n; i++)
            sum += int.Parse(Console.ReadLine());
        Console.WriteLine(sum);
    }
}
