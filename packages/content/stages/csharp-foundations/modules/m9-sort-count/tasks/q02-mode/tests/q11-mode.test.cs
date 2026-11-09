public class Q11ModeTests
{
    [Theory(DisplayName = "Q11 最頻値")]
    [InlineData("4\n2 1 2 3\n", "2\n")]
    public void Q11Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q11Mode())));
    }
}
