// 確認A
// 1行目 N、2行目 N 個の整数。隣が変わった組の個数を表示する。1≦N≦20。
// 例: 5 / 2 2 4 4 1→2

public static partial class Answers
{
    public static void CheckACountChanged()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n - 1; i++)
        {
            if (int.Parse(parts[i]) != int.Parse(parts[i + 1]))
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
