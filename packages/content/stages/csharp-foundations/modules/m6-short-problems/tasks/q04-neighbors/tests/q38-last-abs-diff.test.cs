public class Q38LastAbsDiffTests
{
    [Theory(DisplayName = "Q38 最後の差")]
    [InlineData("4\n3 10 6 20\n", "14\n")]
    [InlineData("2\n3 10\n", "7\n")]
    public void Q38LastAbsDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q38LastAbsDiff())));
    }
}
