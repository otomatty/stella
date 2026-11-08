// S04 指定値との一致
// 1行目に N と k、2行目に N 個の整数。一致する値の個数を表示する。1≦N≦20。
// 例: 4 3 / 3 1 3 5→2

public static partial class Answers
{
    public static void S04CountEqual()
    {
        string[] head = Console.ReadLine().Split();
        int n = int.Parse(head[0]);
        int k = int.Parse(head[1]);
        string[] parts = Console.ReadLine().Split();
        int c = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) == k)
            {
                c = c + 1;
            }
        }
        Console.WriteLine(c);
    }
}
