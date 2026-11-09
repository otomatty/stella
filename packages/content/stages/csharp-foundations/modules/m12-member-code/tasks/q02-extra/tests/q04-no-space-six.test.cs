public class Q04NoSpaceSixTests
{
    [Theory(DisplayName = "Q04 空白を受け付けない6桁版")]
    [InlineData("123456", "", "")]
    [InlineData("012345", "", "")]
    [InlineData("", "Err", "形式不正\n")]
    [InlineData("12345", "Err", "形式不正\n")]
    [InlineData("1234567", "Err", "形式不正\n")]
    [InlineData("12345a", "Err", "形式不正\n")]
    [InlineData("１２３４５６", "Err", "形式不正\n")]
    [InlineData("12３456", "Err", "形式不正\n")]
    [InlineData("123 456", "Err", "空白不可\n")]
    [InlineData("123　456", "Err", "空白不可\n")]
    [InlineData(" ", "Err", "空白不可\n")]
    [InlineData("　", "Err", "空白不可\n")]
    [InlineData("1 ", "Err", "空白不可\n")]
    [InlineData("1　", "Err", "空白不可\n")]
    [InlineData(" 1234567", "Err", "空白不可\n")]
    [InlineData("　1234567", "Err", "空白不可\n")]
    [InlineData("123456 ", "Err", "空白不可\n")]
    [InlineData("12345\t", "Err", "形式不正\n")]
    public void Q04NoSpaceSix(string input, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q04NoSpaceSix(input));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
