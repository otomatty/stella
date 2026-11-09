public class Q03CountLtTests
{
    [Theory(DisplayName = "Q03 P 未満")]
    [InlineData("5\n50 60 80 59 100\n60\n", "2\n")]
    [InlineData("1\n60\n60\n", "0\n")]
    public void Q03CountLt(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q03CountLt())));
    }
}
