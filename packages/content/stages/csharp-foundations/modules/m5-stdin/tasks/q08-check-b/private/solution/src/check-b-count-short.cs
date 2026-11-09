// 確認B
// 入力は1行目 N、続く N 行に名前。最後の行に上限 k。名前が k 文字以下の件数を表示する。1≦N≦20、名前は1〜10文字、1≦k≦10。
// 例: 3 / aki / yuki / bo / 3→2

public static partial class Answers
{
    public static void CheckBCountShort()
    {
        int n = int.Parse(Console.ReadLine());
        string[] names = new string[n];
        for (int i = 0; i < n; i++)
        {
            names[i] = Console.ReadLine();
        }
        int k = int.Parse(Console.ReadLine());
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            if (names[i].Length <= k)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
