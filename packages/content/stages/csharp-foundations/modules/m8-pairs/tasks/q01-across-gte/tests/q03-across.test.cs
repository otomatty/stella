public class Q03AcrossTests
{
    [Theory(DisplayName = "Q03 K以上の組")]
    [InlineData("2 2 4\n2 2\n2 2\n", "4\n")]
    [InlineData("1 1 4\n2\n2\n", "1\n")]
    public void Q03Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q03Across())));
    }
}
