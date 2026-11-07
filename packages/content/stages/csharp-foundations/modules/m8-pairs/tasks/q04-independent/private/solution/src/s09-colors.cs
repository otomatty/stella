// S09 異なる色
// 1行目N、続くN行に色名。異なる色名となる二つの位置の組の個数を表示。順序違いは同じ組。1≦N≦20、色名は半角英字1〜10文字。
// 例: 3 / red / red / blue → 2

public static partial class Answers
{
    public static void S09Colors()
    {
        int n = int.Parse(Console.ReadLine());
        string[] names = new string[n];
        for (int i = 0; i < n; i++) names[i] = Console.ReadLine();
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                if (names[i] != names[j]) count++;
            }
        }
        Console.WriteLine(count);
    }
}
