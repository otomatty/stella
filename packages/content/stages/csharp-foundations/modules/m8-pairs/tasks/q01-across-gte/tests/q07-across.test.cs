public class Q07AcrossTests
{
    [Theory(DisplayName = "Q07 K以上の組")]
    [InlineData("2 2 9\n0 9\n1 9\n", "3\n")]
    [InlineData("1 1 9\n0\n8\n", "0\n")]
    public void Q07Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q07Across())));
    }
}
