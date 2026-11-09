public class Q03ReimplementTests
{
    [Theory(DisplayName = "Q03 仕様から再実装する")]
    [InlineData("12345", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("12345678", "", "")]
    [InlineData("123456789", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("12 34 567", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("12 345678", "", "空白を検知しました\n")]
    [InlineData("1234567　　　", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("　　　", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("1234567a", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("12 34 5678", "", "空白を検知しました\n")]
    [InlineData("01234567", "", "")]
    [InlineData(" 12345678", "", "空白を検知しました\n")]
    [InlineData("1234　5678", "", "空白を検知しました\n")]
    public void Q03Reimplement(string input, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q03Reimplement(input));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
