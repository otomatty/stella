public class ConnectCountLtTests
{
    [Theory(DisplayName = "接続 P 未満")]
    [InlineData("5\n50 60 80 59 100\n60\n", "2\n")]
    [InlineData("3\n70 80 90\n60\n", "0\n")]
    public void ConnectCountLt(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.ConnectCountLt())));
    }
}
