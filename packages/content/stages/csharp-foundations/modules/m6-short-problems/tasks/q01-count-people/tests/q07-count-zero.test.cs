public class Q07CountZeroTests
{
    [Theory(DisplayName = "Q07 0 点")]
    [InlineData("4\n0 10 0 5\n", "2\n")]
    [InlineData("3\n1 2 3\n", "0\n")]
    public void Q07CountZero(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q07CountZero())));
    }
}
