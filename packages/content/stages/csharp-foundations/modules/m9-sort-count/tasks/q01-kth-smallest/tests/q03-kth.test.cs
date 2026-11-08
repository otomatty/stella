public class Q03KthTests
{
    [Theory(DisplayName = "Q03 K番目")]
    [InlineData("3 2\n4 4 1\n", "4\n")]
    public void Q03Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q03Kth())));
    }
}
