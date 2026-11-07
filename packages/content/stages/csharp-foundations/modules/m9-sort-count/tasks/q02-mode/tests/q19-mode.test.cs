public class Q19ModeTests
{
    [Theory(DisplayName = "Q19 最頻値")]
    [InlineData("5\n3 3 3 2 2\n", "3\n")]
    public void Q19Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q19Mode())));
    }
}
