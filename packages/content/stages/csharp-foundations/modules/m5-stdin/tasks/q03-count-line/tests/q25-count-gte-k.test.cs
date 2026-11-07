public class Q25CountGteKTests
{
    [Theory(DisplayName = "Q25 K以上の個数")]
    [InlineData("5\n50 60 80 59 100\n60\n", "3\n")]
    [InlineData("1\n60\n60\n", "1\n")]
    [InlineData("1\n59\n60\n", "0\n")]
    public void Q25CountGteK(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q25CountGteK())));
    }
}
