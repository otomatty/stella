public class Q05OddsTests
{
    [Theory(DisplayName = "Q05 奇数を1から N")]
    [InlineData(7, "1\n3\n5\n7\n")]
    [InlineData(1, "1\n")]
    [InlineData(9, "1\n3\n5\n7\n9\n")]
    public void Q05Odds(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q05Odds(n)));
    }
}
