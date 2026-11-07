public class CheckAFirstNegativeTests
{
    [Theory(DisplayName = "確認A 初めて負")]
    [InlineData("3 3\n-2\n-4\n8\n", "2\n")]
    [InlineData("0 0\n", "-1\n")]
    [InlineData("0 1\n-1\n", "1\n")]
    [InlineData("5 2\n-5\n1\n", "-1\n")]
    public void CheckAFirstNegative(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckAFirstNegative())));
    }
}
