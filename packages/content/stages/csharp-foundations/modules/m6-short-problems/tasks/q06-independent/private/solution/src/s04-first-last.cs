// S04 最初と最後
// 1行目 N、2行目 N 個の整数。最後が最初より大きければ UP、同じなら SAME、小さければ DOWN を表示する。
// 例: 3 / 8 1 5→DOWN

public static partial class Answers
{
    public static void S04FirstLast()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int first = int.Parse(parts[0]);
        int last = int.Parse(parts[n - 1]);
        if (last > first)
        {
            Console.WriteLine("UP");
        }
        else if (last == first)
        {
            Console.WriteLine("SAME");
        }
        else
        {
            Console.WriteLine("DOWN");
        }
    }
}
