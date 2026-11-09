public class Q28OddsTests
{
    [Theory(DisplayName = "Q28 行の奇数")]
    [InlineData("3 2\n0 9\n8 7\n6 5\n", "1\n1\n1\n")]
    [InlineData("1 2\n2 4\n", "0\n")]
    public void Q28Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q28Odds())));
    }
}
