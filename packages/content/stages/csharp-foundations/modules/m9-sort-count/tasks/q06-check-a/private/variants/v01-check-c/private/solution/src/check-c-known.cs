// 確認C 名前の有無
// 1行目N Q、続くN行に名前、その後Q行に問い合わせ名。登場した名前ならyes、未登場ならnoを各行に表示。0≦N≦20、1≦Q≦20、名前は半角英字。
// 例: 2 2 / red / blue / red / green → yes / no

public static partial class Answers
{
    public static void CheckCKnown()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int q = int.Parse(header[1]);
        string[] words = new string[n];
        for (int i = 0; i < n; i++) words[i] = Console.ReadLine();
        for (int j = 0; j < q; j++)
        {
            string query = Console.ReadLine();
            bool found = false;
            for (int i = 0; i < n; i++)
                if (words[i] == query) found = true;
            Console.WriteLine(found ? "yes" : "no");
        }
    }
}
