public class Q09FivesTests
{
    [Theory(DisplayName = "Q09 5の倍数を5から N")]
    [InlineData(20, "5\n10\n15\n20\n")]
    [InlineData(5, "5\n")]
    [InlineData(15, "5\n10\n15\n")]
    public void Q09Fives(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q09Fives(n)));
    }
}
