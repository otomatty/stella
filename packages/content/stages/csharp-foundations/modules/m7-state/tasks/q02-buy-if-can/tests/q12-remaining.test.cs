public class Q12RemainingTests
{
    [Theory(DisplayName = "Q12 残金")]
    [InlineData("0 2\n1\n0\n", "0\n")]
    [InlineData("0 0\n", "0\n")]
    public void Q12Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q12Remaining())));
    }
}
