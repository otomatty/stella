public class Q08KthTests
{
    [Theory(DisplayName = "Q08 K番目")]
    [InlineData("4 3\n10 2 10 2\n", "10\n")]
    public void Q08Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q08Kth())));
    }
}
