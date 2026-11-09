// Q02 先頭の条件
//
// 元の8桁の仕様
// CheckMember8はstring strInputを受け取り、成功時に空文字、失敗時にErrを返す。nullは入力されない。空文字、数字以外も検証する。
//
// 数字8桁は、長さ8で、すべて半角0〜9。先頭0は許可。空白は半角空白と全角空白の2種類で、全位置から削除する。タブは削除しない。
//
// 1. 空白を含む場合は「空白を検知しました」を1行出して、空白を全て削除する。
// 2. 空白を含んでいた場合、削除後が数字8桁でなければ「入力値が正しくありません」を出しErrを返す。数字8桁なら追加ログなしで空文字を返す。
// 3. 空白を含んでいなかった場合、数字8桁でなければ「入力値の桁数が正しくありません」を出しErrを返す。数字8桁ならログなしで空文字を返す。
//
// モードはない。仕様にないログは出さない。IsDigitNは再利用してよい。最初の実装は、空白があった事実をいつ調べるかを考えてから書く。
//
// この問題の変更点
// 元の8桁関数をコピーし、数字8桁の判定に加え、先頭が0なら「先頭不正」を出してErrにする。数字8桁でない場合は元の失敗ログだけを出し、先頭を確認しない。空白の検知ログは元どおり。
// 補助の関数を使う場合は、この問題のメソッドの中に書く。

public static partial class Answers
{
    public static string Q02LeadingZero(string strInput)
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

        bool hasSpace = strInput.Contains(" ") || strInput.Contains("　");
        if (hasSpace)
        {
            Console.WriteLine("空白を検知しました");
            strInput = strInput.Replace(" ", "").Replace("　", "");
        }

        if (!IsDigitN(strInput, 8))
        {
            if (hasSpace)
            {
                Console.WriteLine("入力値が正しくありません");
            }
            else
            {
                Console.WriteLine("入力値の桁数が正しくありません");
            }
            return "Err";
        }
        if (strInput[0] == '0')
        {
            Console.WriteLine("先頭不正");
            return "Err";
        }
        return "";
    }
}
