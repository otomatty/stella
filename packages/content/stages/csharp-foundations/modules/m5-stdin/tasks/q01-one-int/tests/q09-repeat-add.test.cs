public class Q09RepeatAddTests
{
    [Theory(DisplayName = "Q09 NをN回足す")]
    [InlineData("4\n", "16\n")]
    [InlineData("1\n", "1\n")]
    [InlineData("5\n", "25\n")]
    public void Q09RepeatAdd(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q09RepeatAdd())));
    }
}
