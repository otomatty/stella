public class Q02CountDownTests
{
    [Theory(DisplayName = "Q02 Nから1")]
    [InlineData(4, "4\n3\n2\n1\n")]
    [InlineData(1, "1\n")]
    [InlineData(3, "3\n2\n1\n")]
    public void Q02CountDown(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q02CountDown(n)));
    }
}
