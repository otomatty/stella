// S07 二つの列
// 1行目 N、2行目 N 個の整数、3行目 N 個の整数。同じ位置どうしの和を1行ずつ表示する。1≦N≦20。
// 例: 3 / 1 2 3 / 4 5 6→5 / 7 / 9

public static partial class Answers
{
    public static void S07PrintPairSums()
    {
        int n = int.Parse(Console.ReadLine());
        string[] left = Console.ReadLine().Split();
        string[] right = Console.ReadLine().Split();
        for (int i = 0; i < n; i++)
        {
            Console.WriteLine(int.Parse(left[i]) + int.Parse(right[i]));
        }
    }
}
