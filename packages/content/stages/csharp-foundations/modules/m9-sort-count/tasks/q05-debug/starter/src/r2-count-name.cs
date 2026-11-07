// R2 名前の件数
// wordsの各名前を数え、queryの件数を返す。未登場なら0。
// varは右側の値から型を決める書き方。この問題ではDictionary<string,int>と同じ型になる。

public static partial class Answers
{
    public static int R2CountName(string[] words, string query)
    {
        var counts = new System.Collections.Generic.Dictionary<string, int>();
        for (int i = 0; i < words.Length; i++)
            counts[words[i]]++;
        return counts[query];
    }
}
