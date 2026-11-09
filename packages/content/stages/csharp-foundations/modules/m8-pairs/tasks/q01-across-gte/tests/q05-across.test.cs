public class Q05AcrossTests
{
    [Theory(DisplayName = "Q05 K以上の組")]
    [InlineData("3 1 5\n1 2 3\n1\n", "0\n")]
    [InlineData("1 1 5\n1\n1\n", "0\n")]
    public void Q05Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q05Across())));
    }
}
