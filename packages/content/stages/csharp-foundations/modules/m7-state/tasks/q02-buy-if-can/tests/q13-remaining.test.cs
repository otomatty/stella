public class Q13RemainingTests
{
    [Theory(DisplayName = "Q13 残金")]
    [InlineData("5 2\n5\n1\n", "0\n")]
    [InlineData("5 0\n", "5\n")]
    public void Q13Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q13Remaining())));
    }
}
