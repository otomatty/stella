public class Q01AcrossTests
{
    [Theory(DisplayName = "Q01 K以上の組")]
    [InlineData("2 2 6\n1 4\n2 5\n", "3\n")]
    [InlineData("1 1 1\n0\n0\n", "0\n")]
    public void Q01Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q01Across())));
    }
}
