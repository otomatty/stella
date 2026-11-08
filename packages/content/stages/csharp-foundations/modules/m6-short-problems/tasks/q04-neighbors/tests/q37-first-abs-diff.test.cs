public class Q37FirstAbsDiffTests
{
    [Theory(DisplayName = "Q37 最初の差")]
    [InlineData("4\n3 10 6 20\n", "7\n")]
    [InlineData("2\n3 10\n", "7\n")]
    public void Q37FirstAbsDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q37FirstAbsDiff())));
    }
}
