public class Q20RemainingTests
{
    [Theory(DisplayName = "Q20 残金")]
    [InlineData("9 4\n3\n3\n3\n3\n", "0\n")]
    [InlineData("9 0\n", "9\n")]
    public void Q20Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q20Remaining())));
    }
}
