// 到達A 名前の合計
// 入力の各行は半角空白区切り。名前は半角英字1〜10文字。null入力なし。
// 1行目N Q、続くN行に名前と得点、その後Q行に問い合わせ名。同じ名前の得点を合計して問い合わせ順に表示する。未登場なら0。0≦N≦20、1≦Q≦20、点数は0〜100。

public static partial class Answers
{
    public static void CaNameTotal()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int q = int.Parse(header[1]);
        string[] names = new string[n];
        int[] scores = new int[n];
        for (int i = 0; i < n; i++)
        {
            string[] row = Console.ReadLine().Split();
            names[i] = row[0];
            scores[i] = int.Parse(row[1]);
        }
        for (int j = 0; j < q; j++)
        {
            string query = Console.ReadLine();
            int sum = 0;
            for (int i = 0; i < n; i++)
                if (names[i] == query) sum = sum + scores[i];
            Console.WriteLine(sum);
        }
    }
}
