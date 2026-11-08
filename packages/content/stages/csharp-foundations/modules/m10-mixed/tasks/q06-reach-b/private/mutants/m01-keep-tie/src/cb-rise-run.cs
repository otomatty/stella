// 到達B 増加の連続
// 入力の各行は半角空白区切り。名前は半角英字1〜10文字。null入力なし。
// 1行目N、2行目N日分の値。前日より値が大きくなる変化が、最大で何回連続したかを表示する。同じ値なら連続は途切れる。1≦N≦20、値は0〜100。N=1なら0。

public static partial class Answers
{
    public static void CbRiseRun()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int best = 0;
        int current = 0;
        for (int i = 1; i < n; i++)
        {
            int prev = int.Parse(parts[i - 1]);
            int value = int.Parse(parts[i]);
            if (value >= prev)
            {
                current = current + 1;
                if (current > best) best = current;
            }
            else current = 0;
        }
        Console.WriteLine(best);
    }
}
