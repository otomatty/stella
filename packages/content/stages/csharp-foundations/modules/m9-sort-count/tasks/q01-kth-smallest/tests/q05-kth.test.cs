public class Q05KthTests
{
    [Theory(DisplayName = "Q05 K番目")]
    [InlineData("3 3\n-3 -8 -1\n", "-1\n")]
    public void Q05Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q05Kth())));
    }
}
