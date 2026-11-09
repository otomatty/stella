public class Q02LeadingZeroTests
{
    [Theory(DisplayName = "Q02 先頭の条件")]
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
    [InlineData("01234567", "Err", "先頭不正\n")]
    [InlineData(" 12345678", "", "空白を検知しました\n")]
    [InlineData("1234　5678", "", "空白を検知しました\n")]
    [InlineData(" 01234567", "Err", "空白を検知しました\n先頭不正\n")]
    [InlineData("0123", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("0 123", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("0123456a", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("0 123456a", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("1234567\t", "Err", "入力値の桁数が正しくありません\n")]
    public void Q02LeadingZero(string input, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q02LeadingZero(input));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
