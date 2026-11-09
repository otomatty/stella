public class Q01LengthOrCharTests
{
    [Theory(DisplayName = "Q01 長さと文字のログを分ける")]
    [InlineData("12345", "Err", "長さ不正\n")]
    [InlineData("12345678", "", "")]
    [InlineData("123456789", "Err", "長さ不正\n")]
    [InlineData("12 34 567", "Err", "空白を検知しました\n長さ不正\n")]
    [InlineData("12 345678", "", "空白を検知しました\n")]
    [InlineData("1234567　　　", "Err", "空白を検知しました\n長さ不正\n")]
    [InlineData("　　　", "Err", "空白を検知しました\n長さ不正\n")]
    [InlineData("", "Err", "長さ不正\n")]
    [InlineData("1234567a", "Err", "文字不正\n")]
    [InlineData("12 34 5678", "", "空白を検知しました\n")]
    [InlineData("01234567", "", "")]
    [InlineData(" 12345678", "", "空白を検知しました\n")]
    [InlineData("1234　5678", "", "空白を検知しました\n")]
    [InlineData("123a", "Err", "長さ不正\n")]
    [InlineData("12 a", "Err", "空白を検知しました\n長さ不正\n")]
    [InlineData("1234 567a", "Err", "空白を検知しました\n文字不正\n")]
    [InlineData("１２３４５６７８", "Err", "文字不正\n")]
    [InlineData("1234567\t", "Err", "文字不正\n")]
    public void Q01LengthOrChar(string input, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q01LengthOrChar(input));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
