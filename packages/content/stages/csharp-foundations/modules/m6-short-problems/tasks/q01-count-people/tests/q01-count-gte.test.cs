public class Q01CountGteTests
{
    [Theory(DisplayName = "Q01 P 以上")]
    [InlineData("5\n50 60 80 59 100\n60\n", "3\n")]
    [InlineData("1\n60\n60\n", "1\n")]
    public void Q01CountGte(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q01CountGte())));
    }
}
