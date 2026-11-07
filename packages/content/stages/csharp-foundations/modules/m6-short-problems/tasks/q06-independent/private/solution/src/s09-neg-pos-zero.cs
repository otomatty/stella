// S09 集計の対象
// 1行目 N、2行目 N 個の整数。負の数の個数、正の数の合計、0 の個数をこの順に 3 行出す。
// 例: 5 / -2 0 3 -1 4→2 / 7 / 1

public static partial class Answers
{
    public static void S09NegPosZero()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int neg = 0;
        int pos = 0;
        int zeros = 0;
        for (int i = 0; i < n; i++)
        {
            int value = int.Parse(parts[i]);
            if (value < 0)
            {
                neg = neg + 1;
            }
            else if (value > 0)
            {
                pos = pos + value;
            }
            else
            {
                zeros = zeros + 1;
            }
        }
        Console.WriteLine(neg);
        Console.WriteLine(pos);
        Console.WriteLine(zeros);
    }
}
