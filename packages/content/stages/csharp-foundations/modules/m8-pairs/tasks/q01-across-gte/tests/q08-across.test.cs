public class Q08AcrossTests
{
    [Theory(DisplayName = "Q08 K以上の組")]
    [InlineData("3 2 10\n4 5 6\n4 5\n", "3\n")]
    [InlineData("1 1 10\n4\n6\n", "1\n")]
    public void Q08Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q08Across())));
    }
}
