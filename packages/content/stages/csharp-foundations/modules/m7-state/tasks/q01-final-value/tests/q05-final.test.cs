public class Q05FinalTests
{
    [Theory(DisplayName = "Q05 最後の値")]
    [InlineData("20 3\n-5\n-5\n-5\n", "5\n")]
    [InlineData("20 0\n", "20\n")]
    public void Q05Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q05Final())));
    }
}
