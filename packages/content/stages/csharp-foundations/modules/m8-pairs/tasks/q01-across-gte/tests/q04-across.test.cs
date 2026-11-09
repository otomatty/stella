public class Q04AcrossTests
{
    [Theory(DisplayName = "Q04 K以上の組")]
    [InlineData("1 3 7\n5\n1 2 3\n", "2\n")]
    [InlineData("1 1 7\n5\n1\n", "0\n")]
    public void Q04Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q04Across())));
    }
}
