// Q27 名前の件数
// N件の名前を受け取り、その後のQ件の問い合わせについて、同じ名前が何件あったかを各行に表示する。未登場の名前は0。大文字小文字を区別する。入力は1行目N Q、続くN行に名前、その後Q行に問い合わせ名。0≦N≦20、1≦Q≦20。名前は半角英字1〜10文字。
// 例: 3 3 / A / a / A / A / missing / A → 2 / 0 / 2

public static partial class Answers
{
    public static void Q27Name()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int q = int.Parse(header[1]);
        string[] words = new string[n];
        for (int i = 0; i < n; i++) words[i] = Console.ReadLine();
        for (int j = 0; j < q; j++)
        {
            string query = Console.ReadLine();
            int c = 0;
            for (int i = 0; i < n; i++)
                if (words[i] == query) c++;
            Console.WriteLine(c);
        }
    }
}
