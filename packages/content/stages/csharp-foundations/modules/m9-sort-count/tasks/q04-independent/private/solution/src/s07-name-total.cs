// S07 名前の合計
// 1行目N Q、続くN行に名前と数量、その後Q行に問い合わせ名。名前別の数量合計を回答。未登場は0。数量は0〜100。1≦N,Q≦20、名前は半角英字1〜10文字。
// 例: 3 2 / pen 2 / book 3 / pen 4 / pen / eraser → 6 / 0

public static partial class Answers
{
    public static void S07NameTotal()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int q = int.Parse(header[1]);
        string[] names = new string[n];
        int[] qty = new int[n];
        for (int i = 0; i < n; i++)
        {
            string[] row = Console.ReadLine().Split();
            names[i] = row[0];
            qty[i] = int.Parse(row[1]);
        }
        for (int j = 0; j < q; j++)
        {
            string query = Console.ReadLine();
            int s = 0;
            for (int i = 0; i < n; i++)
                if (names[i] == query) s += qty[i];
            Console.WriteLine(s);
        }
    }
}
