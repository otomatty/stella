public class Q09KthTests
{
    [Theory(DisplayName = "Q09 K番目")]
    [InlineData("4 4\n7 6 5 4\n", "7\n")]
    public void Q09Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q09Kth())));
    }
}
