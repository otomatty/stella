// 到達A 大きい組
// 入力の各行は半角空白区切り。名前は半角英字1〜10文字。null入力なし。
// 1行目N T、2行目N個の整数。異なる位置の二つの値の和がTより大きい組数を表示。順序違いは同じ組。1≦N≦20、値とTは0〜100。

public static partial class Answers
{
    public static void CaPairsOver()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int t = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = int.Parse(parts[i]);
        int count = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                if (a[i] + a[j] > t) count = count + 1;
        Console.WriteLine(count);
    }
}
