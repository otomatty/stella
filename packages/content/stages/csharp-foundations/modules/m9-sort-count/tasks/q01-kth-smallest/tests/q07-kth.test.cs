public class Q07KthTests
{
    [Theory(DisplayName = "Q07 K番目")]
    [InlineData("3 3\n0 0 0\n", "0\n")]
    public void Q07Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q07Kth())));
    }
}
