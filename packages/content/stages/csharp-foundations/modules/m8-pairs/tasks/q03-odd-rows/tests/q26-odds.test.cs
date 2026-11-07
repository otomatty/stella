public class Q26OddsTests
{
    [Theory(DisplayName = "Q26 行の奇数")]
    [InlineData("1 4\n1 2 1 2\n", "2\n")]
    [InlineData("1 1\n1\n", "1\n")]
    public void Q26Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q26Odds())));
    }
}
