public class Q06CountEvensTests
{
    [Theory(DisplayName = "Q06 偶数")]
    [InlineData("5\n50 60 80 59 100\n", "4\n")]
    [InlineData("1\n59\n", "0\n")]
    public void Q06CountEvens(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q06CountEvens())));
    }
}
