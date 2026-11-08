public class Q24OddsTests
{
    [Theory(DisplayName = "Q24 行の奇数")]
    [InlineData("2 2\n2 4\n6 8\n", "0\n0\n")]
    [InlineData("1 1\n1\n", "1\n")]
    public void Q24Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q24Odds())));
    }
}
