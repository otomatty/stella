public class Q10KthTests
{
    [Theory(DisplayName = "Q10 K番目")]
    [InlineData("4 2\n8 -2 0 8\n", "0\n")]
    public void Q10Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q10Kth())));
    }
}
