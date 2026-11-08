public class Q06AcrossTests
{
    [Theory(DisplayName = "Q06 K以上の組")]
    [InlineData("2 2 10\n3 8\n2 7\n", "3\n")]
    [InlineData("1 1 10\n3\n7\n", "1\n")]
    public void Q06Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q06Across())));
    }
}
