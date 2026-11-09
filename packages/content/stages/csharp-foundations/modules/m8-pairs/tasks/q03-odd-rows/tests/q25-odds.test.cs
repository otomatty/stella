public class Q25OddsTests
{
    [Theory(DisplayName = "Q25 行の奇数")]
    [InlineData("2 2\n1 3\n5 7\n", "2\n2\n")]
    [InlineData("1 1\n2\n", "0\n")]
    public void Q25Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q25Odds())));
    }
}
