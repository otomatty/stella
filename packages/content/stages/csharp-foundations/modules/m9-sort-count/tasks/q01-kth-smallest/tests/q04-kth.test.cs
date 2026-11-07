public class Q04KthTests
{
    [Theory(DisplayName = "Q04 K番目")]
    [InlineData("4 1\n9 0 3 8\n", "0\n")]
    public void Q04Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q04Kth())));
    }
}
