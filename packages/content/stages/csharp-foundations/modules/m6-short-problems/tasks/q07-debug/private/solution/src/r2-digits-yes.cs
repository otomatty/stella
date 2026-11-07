// R2
// 1行の文字列が空でなく半角数字だけなら Yes、それ以外 No を表示する。

public static partial class Answers
{
    public static void R2DigitsYes()
    {
        string s = Console.ReadLine();
        if (s.Length == 0)
        {
            Console.WriteLine("No");
            return;
        }
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9')
            {
                Console.WriteLine("No");
                return;
            }
        }
        Console.WriteLine("Yes");
    }
}
