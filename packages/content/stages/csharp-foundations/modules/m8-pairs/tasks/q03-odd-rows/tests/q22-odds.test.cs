public class Q22OddsTests
{
    [Theory(DisplayName = "Q22 行の奇数")]
    [InlineData("1 1\n0\n", "0\n")]
    [InlineData("1 1\n1\n", "1\n")]
    public void Q22Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q22Odds())));
    }
}
