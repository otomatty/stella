// R2
// 1行目 N、2行目 N 個の整数の合計を表示する。1≦N≦5。

public static partial class Answers
{
    public static void R2SumParts()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int sum = 0;
        for (int i = 0; i < n; i++)
        {
            sum = sum + int.Parse(parts[i]);
        }
        Console.WriteLine(sum);
    }
}
