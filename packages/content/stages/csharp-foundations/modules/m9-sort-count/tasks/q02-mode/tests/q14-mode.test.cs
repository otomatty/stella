public class Q14ModeTests
{
    [Theory(DisplayName = "Q14 最頻値")]
    [InlineData("5\n5 4 5 4 3\n", "4\n")]
    public void Q14Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q14Mode())));
    }
}
