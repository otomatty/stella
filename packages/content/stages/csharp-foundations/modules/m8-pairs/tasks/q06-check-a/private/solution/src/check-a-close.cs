// 確認A
// 1行目N D、2行目N個の整数。異なる位置の二つの値の差の絶対値がD以下の組数を表示する。順序違いは同じ組。1≦N≦20、0≦D≦100、値は-100〜100。
// 例: 3 2 / 1 3 6 → 1

public static partial class Answers
{
    public static void CheckAClose()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int limit = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                int distance = int.Parse(parts[i]) - int.Parse(parts[j]);
                if (distance < 0) distance = -distance;
                if (distance <= limit) count++;
            }
        }
        Console.WriteLine(count);
    }
}
