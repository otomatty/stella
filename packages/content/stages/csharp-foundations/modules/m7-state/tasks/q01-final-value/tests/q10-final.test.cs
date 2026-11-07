public class Q10FinalTests
{
    [Theory(DisplayName = "Q10 最後の値")]
    [InlineData("1 4\n2\n-4\n3\n-2\n", "0\n")]
    [InlineData("1 0\n", "1\n")]
    public void Q10Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q10Final())));
    }
}
