public class Q09CountRangeTests
{
    [Theory(DisplayName = "Q09 範囲")]
    [InlineData("5\n50 60 80 59 100\n60\n80\n", "2\n")]
    [InlineData("1\n50\n60\n80\n", "0\n")]
    public void Q09CountRange(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q09CountRange())));
    }
}
