public class Q09AcrossTests
{
    [Theory(DisplayName = "Q09 K以上の組")]
    [InlineData("1 1 10\n1\n9\n", "1\n")]
    [InlineData("1 1 10\n1\n8\n", "0\n")]
    public void Q09Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q09Across())));
    }
}
