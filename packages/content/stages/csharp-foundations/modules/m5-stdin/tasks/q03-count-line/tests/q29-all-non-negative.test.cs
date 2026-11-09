public class Q29AllNonNegativeTests
{
    [Theory(DisplayName = "Q29 全部0以上")]
    [InlineData("3\n1 0 2\n", "yes\n")]
    [InlineData("3\n1 -1 2\n", "no\n")]
    [InlineData("1\n0\n", "yes\n")]
    public void Q29AllNonNegative(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q29AllNonNegative())));
    }
}
