public class Q02KthTests
{
    [Theory(DisplayName = "Q02 K番目")]
    [InlineData("1 1\n7\n", "7\n")]
    public void Q02Kth(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q02Kth())));
    }
}
