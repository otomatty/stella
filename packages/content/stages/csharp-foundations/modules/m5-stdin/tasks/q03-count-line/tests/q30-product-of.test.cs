public class Q30ProductOfTests
{
    [Theory(DisplayName = "Q30 積")]
    [InlineData("4\n1 2 3 4\n", "24\n")]
    [InlineData("1\n5\n", "5\n")]
    public void Q30ProductOf(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q30ProductOf())));
    }
}
