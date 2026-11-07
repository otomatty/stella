// S03 同じ値の組
// 1行目N、2行目N個の整数。異なる位置で同じ値の組を数える。順序違いは同じ組。1≦N≦20、値は-100〜100。
// 例: 4 / 2 2 3 2 → 3

public static partial class Answers
{
    public static void S03SameValue()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                if (int.Parse(parts[i]) == int.Parse(parts[j])) count++;
            }
        }
        Console.WriteLine(count);
    }
}
