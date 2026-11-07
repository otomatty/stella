public class Q23MinOfTests
{
    [Theory(DisplayName = "Q23 最小")]
    [InlineData("4\n3 9 4 11\n", "3\n")]
    [InlineData("3\n20 2 15\n", "2\n")]
    [InlineData("1\n7\n", "7\n")]
    public void Q23MinOf(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q23MinOf())));
    }
}
