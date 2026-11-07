public class Q34CountUpTests
{
    [Theory(DisplayName = "Q34 増加")]
    [InlineData("4\n3 10 6 20\n", "2\n")]
    [InlineData("2\n3 10\n", "1\n")]
    [InlineData("2\n10 3\n", "0\n")]
    public void Q34CountUp(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q34CountUp())));
    }
}
