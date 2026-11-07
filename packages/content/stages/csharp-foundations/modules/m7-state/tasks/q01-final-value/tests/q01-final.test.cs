public class Q01FinalTests
{
    [Theory(DisplayName = "Q01 最後の値")]
    [InlineData("10 3\n3\n-4\n2\n", "11\n")]
    [InlineData("10 0\n", "10\n")]
    public void Q01Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q01Final())));
    }
}
