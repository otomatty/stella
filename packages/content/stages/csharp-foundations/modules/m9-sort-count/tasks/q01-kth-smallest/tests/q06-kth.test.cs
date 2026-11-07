public class Q06KthTests
{
    [Theory(DisplayName = "Q06 K番目")]
    [InlineData("5 4\n1 5 2 4 3\n", "4\n")]
    public void Q06Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q06Kth())));
    }
}
