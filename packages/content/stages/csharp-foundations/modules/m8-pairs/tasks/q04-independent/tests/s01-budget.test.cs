public class S01BudgetTests
{
    [Theory(DisplayName = "S01 予算内")]
    [InlineData("2 2 6\n1 4\n2 5\n", "3\n")]
    [InlineData("1 1 6\n10\n10\n", "0\n")]
    public void S01Budget(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S01Budget())));
    }
}
