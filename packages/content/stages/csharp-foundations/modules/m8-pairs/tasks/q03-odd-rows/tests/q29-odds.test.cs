public class Q29OddsTests
{
    [Theory(DisplayName = "Q29 行の奇数")]
    [InlineData("2 3\n3 3 0\n2 1 4\n", "2\n1\n")]
    [InlineData("1 1\n3\n", "1\n")]
    public void Q29Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q29Odds())));
    }
}
