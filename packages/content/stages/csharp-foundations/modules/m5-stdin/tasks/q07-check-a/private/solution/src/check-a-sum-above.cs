// 確認A
// 入力は1行目に N と k、続く N 行に整数。k より大きい値の合計を表示する。0≦N≦20、値は -100〜100。
// 例: 3 4 / 2 / 5 / 8→13

public static partial class Answers
{
    public static void CheckASumAbove()
    {
        string[] head = Console.ReadLine().Split();
        int n = int.Parse(head[0]);
        int k = int.Parse(head[1]);
        int total = 0;
        for (int i = 0; i < n; i++)
        {
            int value = int.Parse(Console.ReadLine());
            if (value > k)
            {
                total = total + value;
            }
        }
        Console.WriteLine(total);
    }
}
