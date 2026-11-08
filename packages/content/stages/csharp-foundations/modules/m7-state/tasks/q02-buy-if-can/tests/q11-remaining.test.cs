public class Q11RemainingTests
{
    [Theory(DisplayName = "Q11 残金")]
    [InlineData("10 3\n6\n6\n3\n", "1\n")]
    [InlineData("10 0\n", "10\n")]
    public void Q11Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q11Remaining())));
    }
}
