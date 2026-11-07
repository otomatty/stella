public class Q18ModeTests
{
    [Theory(DisplayName = "Q18 最頻値")]
    [InlineData("3\n7 7 6\n", "7\n")]
    public void Q18Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q18Mode())));
    }
}
