// S02 条件を満たす日
// 1行目に N,l,r、2行目 N 個の気温。l 以上 r 以下の日数を表示する。l≦r。
// 例: 4 10 20 / 9 10 20 21→2

public static partial class Answers
{
    public static void S02CountInRange()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int l = int.Parse(header[1]);
        int r = int.Parse(header[2]);
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            int value = int.Parse(parts[i]);
            if (value >= l && value <= r)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
