public class Q16RemainingTests
{
    [Theory(DisplayName = "Q16 残金")]
    [InlineData("7 0\n", "7\n")]
    [InlineData("7 1\n0\n", "7\n")]
    public void Q16Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q16Remaining())));
    }
}
