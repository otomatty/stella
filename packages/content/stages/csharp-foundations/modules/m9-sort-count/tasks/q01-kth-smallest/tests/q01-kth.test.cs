public class Q01KthTests
{
    [Theory(DisplayName = "Q01 K番目")]
    [InlineData("3 2\n8 2 5\n", "5\n")]
    public void Q01Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q01Kth())));
    }
}
