public class S01DescendingTests
{
    [Theory(DisplayName = "S01 大きい順")]
    [InlineData("4\n2 8 2 5\n", "8\n5\n2\n2\n")]
    [InlineData("1\n-5\n", "-5\n")]
    public void S01Descending(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S01Descending())));
    }
}
