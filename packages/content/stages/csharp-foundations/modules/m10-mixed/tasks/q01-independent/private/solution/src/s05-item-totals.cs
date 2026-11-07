// S05 品目の増減
// 1行目N Q、続くN行に品名と数量の増減、その後Q行に問い合わせ品名。初登場の品名の数量は0。増減を加えた最終数量を問い合わせ順に表示する。未登場は0。数量の増減は-100〜100、1≦Q≦20。負の最終数量もそのまま表示する。 1≦N≦20、品名は半角英字1〜10文字。
// 例: 3 2 / pen 4 / book 2 / pen -1 / pen / eraser → 3 / 0

public static partial class Answers
{
    public static void S05ItemTotals()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int q = int.Parse(header[1]);
        string[] names = new string[n];
        int[] delta = new int[n];
        for (int i = 0; i < n; i++)
        {
            string[] row = Console.ReadLine().Split();
            names[i] = row[0];
            delta[i] = int.Parse(row[1]);
        }
        for (int j = 0; j < q; j++)
        {
            string query = Console.ReadLine();
            int sum = 0;
            for (int i = 0; i < n; i++)
                if (names[i] == query) sum = sum + delta[i];
            Console.WriteLine(sum);
        }
    }
}
