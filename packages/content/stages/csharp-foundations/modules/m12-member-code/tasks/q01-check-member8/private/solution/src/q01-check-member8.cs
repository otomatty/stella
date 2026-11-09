// Q01 会員コード8桁
//
// CheckMember8はstring strInputを受け取り、成功時に空文字、失敗時にErrを返す。nullは入力されない。空文字、数字以外も検証する。
//
// 数字8桁は、長さ8で、すべて半角0〜9。先頭0は許可。空白は半角空白と全角空白の2種類で、全位置から削除する。タブは削除しない。
//
// 1. 空白を含む場合は「空白を検知しました」を1行出して、空白を全て削除する。
// 2. 空白を含んでいた場合、削除後が数字8桁でなければ「入力値が正しくありません」を出しErrを返す。数字8桁なら追加ログなしで空文字を返す。
// 3. 空白を含んでいなかった場合、数字8桁でなければ「入力値の桁数が正しくありません」を出しErrを返す。数字8桁ならログなしで空文字を返す。
//
// モードはない。仕様にないログは出さない。IsDigitNは再利用してよい。最初の実装は、空白があった事実をいつ調べるかを考えてから書く。
// 補助の関数を使う場合は、この問題のメソッドの中に書く。

public static partial class Answers
{
    public static string Q01CheckMember8(string strInput)
    {
        bool IsDigitN(string s, int n)
        {
            if (s.Length != n)
            {
                return false;
            }
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] < '0' || s[i] > '9')
                {
                    return false;
                }
            }
            return true;
        }

        string strResult = "";
        bool hasSpace = strInput.Contains(" ") || strInput.Contains("　");

        if (hasSpace)
        {
            Console.WriteLine("空白を検知しました");
            strInput = strInput.Replace(" ", "").Replace("　", "");
            if (!IsDigitN(strInput, 8))
            {
                Console.WriteLine("入力値が正しくありません");
                strResult = "Err";
            }
        }
        else
        {
            if (!IsDigitN(strInput, 8))
            {
                Console.WriteLine("入力値の桁数が正しくありません");
                strResult = "Err";
            }
        }

        return strResult;
    }
}
