public class Q13ModeTests
{
    [Theory(DisplayName = "Q13 最頻値")]
    [InlineData("4\n0 0 1 1\n", "0\n")]
    public void Q13Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q13Mode())));
    }
}
