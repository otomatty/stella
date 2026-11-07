// S08 隣の一致位置
// 1行目 N、2行目 N 個の整数。隣が同じ最初の組の左側の 0 始まりの位置を表示する。なければ -1。
// 例: 4 / 2 5 5 5→1

public static partial class Answers
{
    public static void S08FirstSame()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int index = -1;
        for (int i = 0; i < n - 1; i++)
        {
            if (int.Parse(parts[i]) == int.Parse(parts[i + 1]))
            {
                index = i;
                break;
            }
        }
        Console.WriteLine(index);
    }
}
