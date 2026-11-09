public class Q40NonDecreasingTests
{
    [Theory(DisplayName = "Q40 単調増加")]
    [InlineData("4\n1 2 2 5\n", "Yes\n")]
    [InlineData("4\n3 10 6 20\n", "No\n")]
    [InlineData("2\n2 2\n", "Yes\n")]
    public void Q40NonDecreasing(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q40NonDecreasing())));
    }
}
