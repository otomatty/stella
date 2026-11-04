/// 課題の答えを書くクラス。テスト (tests/) がこのメソッドを呼び出す。
public static class Answers
{
    /// 1 から n までの合計を返す。
    public static int Sum(int n)
    {
        int total = 0;
        for (int i = 1; i <= n; i++)
        {
            total += i;
        }
        return total;
    }

    /// 1 から n までを 1 行ずつ表示する。
    public static void CountUp(int n)
    {
        for (int i = 1; i <= n; i++)
        {
            Console.WriteLine(i);
        }
    }
}
